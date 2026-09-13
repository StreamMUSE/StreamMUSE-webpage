# v2 demo videos

The gallery at `/versions/v2#media` contains all twenty approved MP4 recordings from the `StreamMUSE v2` source folder. They are grouped into ten song cards in the same order as the MIDI examples. Five songs have one recording; the other five have three recordings, accessible through Take 1/2/3 buttons. Take numbers come from the recording filenames and do not imply MIDI generation seeds.

All MP4 files are copied without re-encoding or changing the audio, timing, or framing. Playback preserves each recording's aspect ratio. Native video controls provide seeking, volume and fullscreen, with a direct MP4 link for each selected take.

Initially each card shows a WebP poster. No MP4 source is assigned until the visitor presses Play. Switching takes releases the previous recording and returns to its poster. Starting a demo video pauses other media on the page; starting a MIDI example also pauses any playing demo video.

## Source mapping

- `src/data/v2-video-examples.json` defines the ten song cards and twenty recordings.
- `public/media/streammuse/v2/videos/` contains twenty original MP4 files and twenty generated WebP posters.
- `docs/v2-video-examples-audit.json` records original filenames, SHA-256 hashes, durations, codecs and poster timestamps.
- The source filename `cruel angle 正式 1.mp4` is mapped to the existing song title `cruel angel`.

The website uses only static media files; no video-hosting account or database is needed.

## Regeneration and validation

From the repository root, with Python, FFmpeg and ffprobe installed:

```sh
python3 scripts/prepare-v2-videos.py '/path/to/StreamMUSE v2'
npm test
npm run lint
npm run typecheck
npm run build
```

The preparation script verifies that all twenty recordings are mapped and that each copied MP4 matches its source bytes. Posters use a frame at 45% of each recording, after the setup/count-in. The asset tests check the take mapping, file inventory and published hashes. Browser verification should include deferred video loading, take switching, native playback/seeking, error recovery, playback coordination with MIDI, and mobile layout.
