"""Publish only the approved Chinese/Japanese pairs from Round2_Prepared."""
import argparse
import hashlib
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'stream=codec_name,codec_type,width,height,nb_frames,avg_frame_rate,duration', '-of', 'json', str(path)]))['streams']

def audio_digest(path):
    return subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path),
        '-map', '0:a:0', '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).decode().strip()

def encode(source, entry, clip, song_id):
    src = source / clip['output']
    assert digest(src) == clip['export_sha256'], f'Prepared source changed: {src}'
    source_video = next(s for s in probe(src) if s['codec_type'] == 'video')
    assert source_video['avg_frame_rate'] == '30/1' and int(source_video['nb_frames']) == entry['frames']
    view, take = clip['view'], entry['take']
    base = f'/media/streammuse/v2/round2/{song_id}/take-{take}-{view}'
    target, poster = Path(f'public{base}.mp4'), Path(f'public{base}.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix('.encoding.mp4')
    camera = view == 'camera'
    audio_options = ['-map', '0:a:0', '-c:a', 'copy'] if camera else ['-an']
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(src), '-map', '0:v:0',
        *audio_options, '-vf', 'scale=1280:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow',
        '-threads', '4', '-crf', '28' if camera else '24', '-maxrate', '850k' if camera else '500k',
        '-bufsize', '1700k' if camera else '1000k', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-map_metadata', '-1', '-y', str(temp)], check=True)
    streams = probe(temp)
    video = next(s for s in streams if s['codec_type'] == 'video')
    assert video['codec_name'] == 'h264' and video['avg_frame_rate'] == '30/1'
    assert int(video['nb_frames']) == entry['frames']
    assert abs(float(video['duration']) - entry['duration']) < .001
    assert video['width'] == 1280 and video['height'] <= 720
    audio_hash = audio_digest(src) if camera else None
    if camera:
        assert audio_digest(temp) == audio_hash, 'Camera audio must be copied unchanged'
    else:
        assert all(s['codec_type'] != 'audio' for s in streams)
    assert temp.stat().st_size < src.stat().st_size
    temp.replace(target)
    poster_time = round(entry['duration'] * .45, 3)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(poster_time), '-i', str(target),
        '-frames:v', '1', '-vf', 'scale=960:-2', '-c:v', 'libwebp', '-quality', '78', '-y', str(poster)], check=True)
    record = dict(src=f'{base}.mp4', poster=f'{base}.webp', width=video['width'], height=video['height'])
    audit = dict(song=song_id, take=take, view=view, sourceFile=clip['output'],
        sourceSha256=clip['export_sha256'], sourceBytes=src.stat().st_size, src=f'{base}.mp4',
        videoSha256=digest(target), posterSha256=digest(poster), bytes=target.stat().st_size,
        duration=float(video['duration']), frames=int(video['nb_frames']), fps=30,
        width=video['width'], height=video['height'], cameraAudioSha256=audio_hash,
        hasAudio=camera, posterTime=poster_time, pair=entry['id'])
    print(f'{song_id} Take {take} {view}: {audit["sourceBytes"] / 1e6:.2f} -> {audit["bytes"] / 1e6:.2f} MB', flush=True)
    return record, audit

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    source = parser.parse_args().source
    entries = json.loads((source / 'manifest.json').read_text())['entries']
    approved = [e for e in entries if e['directory'].split('/')[0] in ('Chinese', 'Japanese')]
    assert len(approved) == 11 and all(e['status'] == 'paired' for e in approved)
    song_ids = {'童话': '01', 'Lemon': '04', "A Cruel Angel's Thesis": '05', '告白气球': '06',
                '青花瓷': '07', '月亮代表我的心': '09', '天空之城': '10', '一路向北': '11'}
    songs, audit = {}, []
    approved.sort(key=lambda e: (song_ids[e['song']], e['take']))
    jobs = [(entry, clip, song_ids[entry['song']]) for entry in approved for clip in entry['clips']]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda job: encode(source, *job), jobs))
    for (entry, clip, song_id), (record, asset) in zip(jobs, results):
        song = songs.setdefault(song_id, dict(id=song_id, title=entry['song'], takes=[]))
        if not song['takes'] or song['takes'][-1]['take'] != entry['take']:
            song['takes'].append(dict(id=f"v2-round2-{song_id}-{entry['take']}", take=entry['take'], duration=entry['duration']))
        song['takes'][-1][clip['view']] = record
        audit.append(asset)
    Path('src/data/v2-round2-videos.json').write_text(json.dumps(list(songs.values()), ensure_ascii=False, indent=2)+'\n')
    Path('docs/v2-round2-videos-audit.json').write_text(json.dumps(dict(source='Round2_Prepared',
        approvedDirectories=['Chinese', 'Japanese'], audioSource='camera', encoding=dict(width=1280, fps=30, cameraCRF=28, screenCRF=24, preset='slow', keyframeSeconds=2, cameraAudio='stream copy', screenAudio='removed'), assets=audit), ensure_ascii=False, indent=2)+'\n')
    print(f'Published {len(songs)} songs, {len(approved)} paired takes, {len(audit)} web-optimized videos.')

if __name__ == '__main__':
    main()
