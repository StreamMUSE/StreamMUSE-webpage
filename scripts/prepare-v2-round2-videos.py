"""Publish only the approved Chinese/Japanese pairs from Round2_Prepared."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

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
    for entry in sorted(approved, key=lambda e: (song_ids[e['song']], e['take'])):
        song_id, take = song_ids[entry['song']], entry['take']
        song = songs.setdefault(song_id, dict(id=song_id, title=entry['song'], takes=[]))
        recording = dict(id=f'v2-round2-{song_id}-{take}', take=take, duration=entry['duration'])
        for clip in entry['clips']:
            src = source / clip['output']
            assert digest(src) == clip['export_sha256'], f'Prepared source changed: {src}'
            base = f'/media/streammuse/v2/round2/{song_id}/take-{take}-{clip["view"]}'
            target, poster = Path(f'public{base}.mp4'), Path(f'public{base}.webp')
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, target)
            assert digest(target) == clip['export_sha256']
            meta = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                'stream=codec_name,codec_type,width,height,nb_frames,avg_frame_rate,duration', '-of', 'json', str(src)]))
            video = next(s for s in meta['streams'] if s['codec_type'] == 'video')
            assert video['codec_name'] == 'h264' and video['avg_frame_rate'] == '30/1'
            assert int(video['nb_frames']) == entry['frames']
            poster_time = round(entry['duration'] * .45, 3)
            subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(poster_time), '-i', str(src),
                '-frames:v', '1', '-vf', 'scale=960:-2', '-c:v', 'libwebp', '-quality', '78', '-y', str(poster)], check=True)
            recording[clip['view']] = dict(src=f'{base}.mp4', poster=f'{base}.webp', width=video['width'], height=video['height'])
            audit.append(dict(song=song_id, take=take, view=clip['view'], sourceFile=clip['output'],
                src=f'{base}.mp4', videoSha256=digest(target), posterSha256=digest(poster), bytes=target.stat().st_size,
                duration=float(video['duration']), frames=int(video['nb_frames']), fps=30, posterTime=poster_time,
                pair=entry['id']))
        assert {'camera', 'screen'} <= recording.keys()
        song['takes'].append(recording)
    Path('src/data/v2-round2-videos.json').write_text(json.dumps(list(songs.values()), ensure_ascii=False, indent=2)+'\n')
    Path('docs/v2-round2-videos-audit.json').write_text(json.dumps(dict(source='Round2_Prepared',
        approvedDirectories=['Chinese', 'Japanese'], audioSource='camera', assets=audit), ensure_ascii=False, indent=2)+'\n')
    print(f'Published {len(songs)} songs, {len(approved)} paired takes, {len(audit)} unchanged videos.')

if __name__ == '__main__':
    main()
