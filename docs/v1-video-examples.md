# v1 performance videos

The v1 Real-time section presents two verified camera/screen pairs as Performance 01 and Performance 02, followed by reviewed standalone camera and screen recordings (Performance 03-18). Song names have not been verified. Debug-interrupted and stale disconnected screen recordings are excluded. See [the unmatched review](v1-unmatched-review.md) for per-source decisions and cuts.

The four MP4s and four JPEG posters are copied without re-encoding from `Sample/StreamMUSE v1/Rematched_720p`. Sources were relocated from the older `Sample/video` directory; the manifest still contains that historical root. Files are matched by relative path, not by the stale absolute root.

| Performance | Prepared pair | Original camera | Original screen | Original screen offset | Duration |
| --- | --- | --- | --- | --- | --- |
| 01 | Pair_01_R03_P03 | Recording/IMG_9798.MOV | Paired/pair_02_bar22_bass_notes/张家栋 2026-05-05 05.19.15.mp4 | +24.315 s | 59.133333 s |
| 02 | Pair_02_R05_P05 | Recording/IMG_9800.MOV | Paired/pair_03_bar21_sparse/张家栋 2026-05-05 05.19.13.mp4 | +17.794 s | 54.533333 s |

Prepared clips already have aligned zero-time starts; do not apply these original offsets again. Both pairs run at 30 fps. Camera is 1280 x 720; screen is 1108 x 720 (01) and 1130 x 720 (02), preserving aspect ratio. Existing source audio is retained; the shared player plays camera audio only.

The existing v2 dual-view player supplies synchronized playback/seeking, view swapping, volume, fullscreen where supported, playback coordination, deferred MP4 loading, and retry handling. The initial render loads posters rather than all videos.

## Storage and quality

The four paired videos total 24,310,797 bytes (24.31 MB decimal), plus posters; additional reviewed single-view video sizes are recorded separately in `v1-reviewed-videos-audit.json`. Website delivery intentionally uses 720p-or-lower derivatives to limit Git repository size and bandwidth. Originals remain in OneDrive; future YouTube uploads must use the highest-quality originals, not these prepared copies. No original media is changed and no video is automatically uploaded to YouTube.

The former 6-second placeholder is removed from version metadata; its existing files are retained to avoid unrelated deletions.

## Verification

- Four MP4 hashes match the source preparation manifest; the asset test checks published inventory, duration/frame counts, dimensions and JPEG posters.
- Six focused tests passed, including the existing shared paired-playback controller tests.
- TypeScript, lint for changed source files, and the Next.js production build passed.
- Browser QA verified both pairs playing with expected decoded dimensions, screen audio muted, cross-player pause, view swapping, seeking, deferred source loading, and desktop/narrow-screen layouts without horizontal overflow. No browser console errors were observed.
- Local build used temporary Node 22 because the machine's Homebrew Node was missing a shared library. No project dependency versions were changed. Next.js updated its generated type declaration and required TypeScript settings during build.
