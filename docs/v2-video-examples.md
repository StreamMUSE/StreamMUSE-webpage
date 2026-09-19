# StreamMUSE+ demo videos

The gallery at `/versions/v2#media` has two recording rounds. Round 2 is selected initially and contains eight songs with eleven paired performances. Round 1 retains the original ten songs and twenty screen recordings. Each song has a take selector; take numbers identify performances, not MIDI generation seeds.

## Round 2: synchronized camera and screen

Only the top-level `Chinese` and `Japanese` directories of `Round2_Prepared` were approved for publication. No `Unidentified` or `Unmatched` clips are included. The 22 prepared MP4s are encoded for web playback. Camera video stays at 1280×720; screen recordings are reduced to 1280×706 without cropping. Both keep all original frames at 30 fps and their prepared start times/durations. H.264 uses CRF 28 for camera and CRF 24 for screen, a slow preset, two-second keyframes and fast-start MP4 layout. Camera AAC audio is copied without re-encoding and its packet hash is checked against the prepared source. The unused screen audio track is removed. Prepared source files are never modified.

The camera starts as the main view, with the screen recording in the lower-right inset. Clicking the inset or Swap views exchanges their visual positions without replacing either video element or restarting playback. **Only camera audio is audible**, regardless of the main view. Mute and volume control the camera; the screen stays muted at zero volume.

The paired player uses one play/pause button and timeline. The camera is the playback clock. A buffering or drifting screen recording catches up silently without pausing or seeking the camera. Only actual camera buffering holds playback; it resumes after a small buffer has accumulated to avoid repeated stop/start cycles. User-initiated seeking still moves both views together. On supported browsers, fullscreen includes both views and the shared controls. Selecting another take or round releases the previous media; playing another demo or MIDI also cancels a pair waiting for data. Video sources are assigned only after Play is pressed, so browsing the gallery loads posters rather than all 22 MP4s.

- `src/data/v2-round2-videos.json`: eight songs and eleven pairs.
- `public/media/streammuse/v2/round2/`: 22 MP4s and 22 WebP posters.
- `docs/v2-round2-videos-audit.json`: prepared source paths, hashes, dimensions-related frame checks and pair IDs. No original capture metadata is published.
- `src/lib/paired-video.ts`: playback coordination, separate from React layout.

To import the approved media, with Python, FFmpeg and ffprobe available:

```sh
python3 scripts/prepare-v2-round2-videos.py '/path/to/Round2_Prepared'
```

The importer checks the prepared manifest's hashes, 30 fps and identical frame counts before encoding, then validates the encoded frame counts, dimensions, duration and camera audio before publishing. The existing prepared start times are already aligned; do not apply their source offsets a second time.

## Round 1

Round 1 contains all twenty approved MP4 recordings from the original source folder. They are grouped into ten song cards in the same order as the MIDI examples. Five songs have one recording; the other five have three recordings, accessible through Take 1/2/3 buttons.

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
python3 scripts/prepare-v2-videos.py '/path/to/StreamMUSE v2/Round1'
npm test
npm run lint
npm run typecheck
npm run build
```

The preparation script verifies that all twenty recordings are mapped and that each copied MP4 matches its source bytes. Posters use a frame at 45% of each recording, after the setup/count-in. The asset tests check the take mapping, file inventory and published hashes. Browser verification should include deferred video loading, take switching, native playback/seeking, error recovery, playback coordination with MIDI, and mobile layout.

Round 2 tests additionally verify the approved directory boundary, exact pair mapping and frame counts, web dimensions, reduced sizes, camera-only audio, buffering, seeking, cancellation and retry behavior. A regression test verifies that screen buffering and drift never pause or seek the audible camera. Browser checks should exercise swapping views without resetting time, shared seeking, camera volume, take/round changes, fullscreen and small screens.

The playback regression was also checked in a real browser with the screen stream limited to 16 KB/s while the camera streamed normally. The screen repeatedly buffered, but the 38.1-second camera clip completed without additional camera pauses or seeks between startup and the end. This verifies that screen stalls do not interrupt the music; it does not guarantee that an under-supplied screen stream can display every frame in sync.
