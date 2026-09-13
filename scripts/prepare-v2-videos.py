"""Copy the approved v2 recordings and prepare small, representative posters."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    songs = json.loads(Path("src/data/v2-midi-examples.json").read_text())
    # The recording folder spells the song title "cruel angle".
    aliases = {"cruel angle": "cruel angel"}
    selected = {song["id"]: [] for song in songs}
    titles = {song["title"].casefold(): song for song in songs}
    sources = sorted(args.source.rglob("*.mp4"))
    assert len(sources) == 20, "Expected the twenty approved recordings"
    for source in sources:
        match = re.fullmatch(r"(.+?)\s+正式\s*(\d+)", source.stem)
        assert match, f"Unexpected recording name: {source.name}"
        title, number = match.groups()
        title = aliases.get(title.casefold(), title.casefold())
        song = titles[title]
        selected[song["id"]].append((int(number), source))

    catalog, audit = [], []
    for song in songs:
        recordings = sorted(selected[song["id"]])
        assert [n for n, _ in recordings] in ([1], [1, 2, 3])
        takes = []
        for number, source in recordings:
            metadata = json.loads(subprocess.check_output([
                "ffprobe", "-v", "error", "-show_entries",
                "format=duration:stream=codec_name,codec_type,width,height",
                "-of", "json", str(source),
            ]))
            video = next(s for s in metadata["streams"] if s["codec_type"] == "video")
            audio = next(s for s in metadata["streams"] if s["codec_type"] == "audio")
            assert video["codec_name"] == "h264" and audio["codec_name"] == "aac"
            duration = float(metadata["format"]["duration"])
            base = f'/media/streammuse/v2/videos/{song["id"]}/take-{number}'
            target, poster = Path(f"public{base}.mp4"), Path(f"public{base}.webp")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            # Choose the middle of the performance, after its setup/count-in.
            poster_time = round(duration * 0.45, 3)
            subprocess.run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(poster_time),
                "-i", str(source), "-frames:v", "1", "-vf", "scale=960:-2",
                "-c:v", "libwebp", "-quality", "78", "-y", str(poster),
            ], check=True)
            digest = sha256(source)
            assert sha256(target) == digest, "Published MP4 must match the source exactly"
            takes.append({
                "id": f'v2-video-{song["id"]}-{number}', "take": number,
                "src": f"{base}.mp4", "poster": f"{base}.webp", "duration": duration,
                "width": video["width"], "height": video["height"],
            })
            audit.append({
                "song": song["id"], "take": number,
                "sourceFile": str(source.relative_to(args.source)),
                "videoSha256": digest, "posterSha256": sha256(poster),
                "bytes": target.stat().st_size, "duration": duration,
                "posterTime": poster_time, "videoCodec": "h264", "audioCodec": "aac",
            })
        catalog.append({"id": song["id"], "title": song["title"], "takes": takes})

    Path("src/data/v2-video-examples.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    Path("docs/v2-video-examples-audit.json").write_text(json.dumps({
        "source": "StreamMUSE v2", "assets": audit,
    }, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared {len(audit)} unchanged MP4 recordings and posters across {len(catalog)} songs.")


if __name__ == "__main__":
    main()
