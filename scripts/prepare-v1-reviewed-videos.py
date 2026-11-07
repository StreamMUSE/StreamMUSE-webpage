"""Export reviewed source-resolution masters and bounded-size website derivatives."""

import argparse
import concurrent.futures
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import threading
import tempfile

FAILED = threading.Event()


def run(args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        FAILED.set()
        print(json.dumps({'command': args, 'exitCode': result.returncode,
                          'error': result.stderr.decode(errors='replace')[-4000:]}), flush=True)
        result.check_returncode()
    return result


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def probe(path):
    data = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]).stdout)
    video = next(stream for stream in data['streams'] if stream['codec_type'] == 'video')
    audio = next(stream for stream in data['streams'] if stream['codec_type'] == 'audio')
    return data, video, audio


def validate(path, width, height, duration, fps, copied=False):
    data, video, audio = probe(path)
    assert (video['width'], video['height']) == (width, height), path
    assert abs(float(video['duration']) - duration) <= (8 if copied else 2) / fps, path
    assert abs(float(data['format']['duration']) - duration) < (.3 if copied else .15), path
    assert abs(float(Fraction(video['r_frame_rate' if copied else 'avg_frame_rate'])) - fps) < .01, path
    assert abs(int(video['nb_frames']) - round(duration * fps)) <= (8 if copied else 0), path
    decoded = run(['ffmpeg', '-v', 'error', '-threads', '2', '-i', str(path), '-f', 'null', '-'])
    assert not decoded.stderr.strip(), decoded.stderr.decode()
    return {'bytes': path.stat().st_size, 'sha256': sha(path), 'width': width, 'height': height,
            'duration': float(video['duration']), 'fps': fps, 'frames': int(video['nb_frames']),
            'averageFrameRate': float(Fraction(video['avg_frame_rate'])),
            'codec': video['codec_name'], 'audioChannels': audio['channels'], 'fullDecodeOk': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--analysis', type=Path, required=True)
    parser.add_argument('--repository', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    source = args.source.resolve()
    archive = args.archive.resolve()
    repository = args.repository.resolve()
    assert archive != source and archive.name.startswith('Reviewed_')
    cuts = json.loads((repository / 'scripts/v1-reviewed-cuts.json').read_text())
    inventory = json.loads((source / 'Rematched_720p/Evidence/inventory.json').read_text())
    analysis = json.loads(args.analysis.read_text())
    by_id = {item['id']: item for item in inventory}
    audit_path = repository / 'docs/v1-reviewed-videos-audit.json'
    previous = {asset['id']: asset for asset in json.loads(audit_path.read_text())['assets']} if audit_path.exists() else {}
    assert all(item['decode_ok'] and item['hash_matches'] for item in analysis)
    for item in inventory:
        assert sha(source / item['relative']) == item['sha256'], item['id']
    web = repository / 'public/media/streammuse/v1/single-view'
    web.mkdir(parents=True, exist_ok=True)
    masters = archive / 'Source_Resolution'
    masters.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='streammuse-v1-masters-', dir='/private/tmp'))

    def export(index_clip):
        if FAILED.is_set():
            raise RuntimeError('Earlier export failed; stopping remaining jobs')
        index, clip = index_clip
        number = f'{index + 3:02d}'
        item = by_id[clip['sourceId']]
        assert item['kind'] == clip['view']
        original = source / item['relative']
        _, source_video, _ = probe(original)
        fps = float(Fraction(source_video['r_frame_rate']))
        start = round(clip['start'] * fps) / fps
        frames = math.floor((min(clip['end'], item['duration']) - start) * fps + .00001)
        duration = frames / fps
        end = start + duration
        name = f'performance-{number}-{clip["view"]}'
        master = staging / f'{name}.mp4'
        archived_master = masters / f'{name}.mp4'
        website = web / f'{name}.mp4'
        poster = web / f'{name}.jpg'
        old = previous.get(f'v1-performance-{number}', {})
        reusable = (website.exists() and old.get('sourceSha256') == item['sha256']
                    and old.get('start') == start and old.get('end') == end
                    and sha(website) == old.get('web', {}).get('sha256'))
        # Retain source audio in the master; give the website a fixed gain reduction only if needed.
        audio_check = run(['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(original), '-t', str(duration),
                           '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le', '-']).stdout
        import array
        samples = array.array('f')
        samples.frombytes(audio_check)
        peak = max(abs(sample) for sample in samples)
        peak_db = 20 * math.log10(max(peak, 1e-12))
        gain_db = min(0, -math.ceil(peak_db + 1.5))
        width, height = source_video['width'], source_video['height']
        web_height = min(720, height)
        web_width = round(width * web_height / height / 2) * 2
        for target, crf, scale, audio_args in [
            (master, '16', [], ['-c:a', 'copy']),
            (website, '25' if clip['view'] == 'camera' else '23',
             ['-vf', f'scale={web_width}:{web_height}:flags=lanczos'],
             ['-af', f'volume={gain_db}dB', '-c:a', 'aac', '-b:a', '160k']),
        ]:
            if target == master or not reusable:
                print(json.dumps({'encoding': target.name, 'source': item['id']}), flush=True)
                temporary = target.with_suffix('.partial.mp4')
                run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-ss', str(start), '-i', str(original),
                     '-t', str(duration), '-map', '0:v:0', '-map', '0:a:0', '-map_metadata', '-1',
                     *(['-c:v', 'copy'] if target == master and start == 0 else
                       ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-threads', '2',
                        '-pix_fmt', 'yuv420p', '-r', str(fps), '-fps_mode', 'cfr', '-frames:v', str(frames)]),
                     *scale, *audio_args, '-movflags', '+faststart', str(temporary)])
                temporary.replace(target)
        master_spec = validate(master, width, height, duration, fps, copied=start == 0)
        web_spec = validate(website, web_width, web_height, duration, fps)
        shutil.copy2(master, archived_master)
        assert sha(archived_master) == master_spec['sha256']
        if not poster.exists() or not reusable:
            run(['ffmpeg', '-v', 'error', '-y', '-ss', str(duration * .45), '-i', str(website),
                 '-frames:v', '1', '-vf', 'scale=800:-2', '-q:v', '3', str(poster)])
        entry = {'id': f'v1-performance-{number}', 'title': f'Performance {number}', 'take': 1,
                 'view': clip['view'], 'duration': web_spec['duration'],
                 'src': f'/media/streammuse/v1/single-view/{website.name}',
                 'poster': f'/media/streammuse/v1/single-view/{poster.name}',
                 'width': web_width, 'height': web_height}
        audit = {'id': entry['id'], 'sourceId': item['id'], 'sourceFile': item['relative'],
                 'sourceSha256': item['sha256'], 'sourceWidth': width, 'sourceHeight': height,
                 'sourceFps': fps, 'start': start, 'end': end, 'reason': clip['reason'],
                 'archiveFile': str(archived_master.relative_to(archive)), 'master': master_spec, 'web': web_spec,
                 'masterVideoCopied': start == 0,
                 'src': entry['src'], 'poster': entry['poster'], 'posterSha256': sha(poster),
                 'webAudioGainDb': gain_db, 'sourceClipPeakDbfs': peak_db}
        print(json.dumps({'exported': entry['title'], 'source': item['id'], 'webMB': round(web_spec['bytes']/1e6,2)}, ensure_ascii=False), flush=True)
        return entry, audit

    def guarded_export(job):
        try:
            return export(job)
        except Exception as error:
            FAILED.set()
            print(json.dumps({'failedClip': job[1], 'error': repr(error)}), flush=True)
            raise

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(guarded_export, enumerate(cuts['clips'])))
    for item in inventory:
        assert sha(source / item['relative']) == item['sha256'], 'Original modified: ' + item['id']
    entries, assets = zip(*results)
    report = {'reviewDate': cuts['reviewDate'], 'originalsUnchanged': True, 'allOriginalsDecodeOk': True,
              'reviewedUnmatchedSources': 18, 'newPairsConfirmed': 0,
              'masterEncoding': 'Camera: original video/audio streams copied without re-encoding. Precisely trimmed screens: H.264 CRF 16, source resolution/frame rate and audio copied.',
              'webEncoding': 'H.264 CRF 25 camera / 23 screen, height capped at 720 without upscaling, AAC 160k.',
              'excluded': cuts['excluded'], 'assets': list(assets)}
    (repository / 'src/data/v1-single-videos.json').write_text(json.dumps(entries, indent=2, ensure_ascii=False)+'\n')
    (repository / 'docs/v1-reviewed-videos-audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
    (archive / 'manifest.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
    (archive / 'originals.json').write_text(json.dumps([
        {**item, 'path': str(source / item['relative'])} for item in inventory
    ], indent=2, ensure_ascii=False)+'\n')
    evidence = archive / 'Evidence'
    evidence.mkdir(exist_ok=True)
    for name in ['analysis.json', 'pair-recheck.json']:
        shutil.copy2(args.analysis.parent / name, evidence / name)
    for contact in args.analysis.parent.glob('*-contact.jpg'):
        shutil.copy2(contact, evidence / contact.name)
    for temporary in masters.glob('performance-*-*.partial.mp4'):
        temporary.unlink()
    shutil.rmtree(staging)
    print(json.dumps({'clips':len(entries), 'webBytes':sum(a['web']['bytes'] for a in assets),
                      'masterBytes':sum(a['master']['bytes'] for a in assets), 'archive':str(archive)}, ensure_ascii=False),flush=True)


if __name__ == '__main__':
    main()
