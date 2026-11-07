# v1 unmatched video review

## Scope

Review date: 2026-11-07. All 22 source files were hashed against the earlier inventory and fully decoded. The 18 sources outside the two already-published pairs were reviewed using timestamped contact sheets, audio activity/peaks and the existing screen-state measurements. All originals remain unchanged. This is technical/visual screening, not a claim of musical quality or a complete song performance; recordings that begin or end mid-performance remain excerpts.

## Pairing recheck

Audio was decoded at 8 kHz for analysis, never for the published output. Twelve log-frequency bands and three independent approximately 12-second windows per camera were compared against all eight screen recordings. The two known pairs were recovered with average correlation scores of 0.830 and 0.759 and consistent offsets. Other candidates scored at most 0.429 and/or disagreed about the offset. Together with the earlier visual and window checks, this did not establish a new pair. Scores are similarity measures, not probabilities. New clips are published only as standalone camera or screen recordings.

## Decisions

| Source | Result | Source interval, seconds | Reason |
| --- | --- | --- | --- |
| R01 | Performance 03, camera | 0-66.1 | Continuous recorded performance; trim idle ending. |
| R02 | Performance 04, camera | 0-70.4 | Continuous performance and piano-roll responses; trim waiting at end. |
| R04 | Performance 05, camera | 0-70.8 | Visible accompaniment; trim operator interaction at end. |
| R06 | Performance 06, camera | 0-51.4 | Retain performance; trim terminal interaction after playing stops. |
| P04 | Performance 07, camera | 0-53.4 | Retain recorded melody opening and continuous performance; trim terminal-switch ending. |
| P06 | Performance 08, camera | 0-50.1 | Continuous performance with piano-roll responses; trim idle ending. |
| P08 | Performance 09, camera | 0-56.8 | Retain opening melody; trim terminal-switch ending. |
| P10 | Performance 10, camera | 0-67.0 | Continuous performance with accompaniment; trim terminal-switch ending. |
| P12 | Performance 11, camera | 0-25.5 | Short excerpt; trim conversation/operator interaction after playing. |
| P14 | Performance 12, camera | 0-66.2 | Continuous performance; trim terminal-switch ending. |
| P16 | Performance 13, camera | 0-source end | Preserve captured performance; do not invent a musical ending. |
| P01 | Performance 14, screen | 13.2-49.8 | Remove browser connection-error transition; retain active session and a short release. |
| P07 | Performance 15, screen | 17.0-45.3 | First active session, before disconnection. |
| P07 | Performance 16, screen | 102.85-164.5 | Second independent active session, after intervening browser-error transition. Not spliced to the first. |
| P09 | Performance 17, screen | 59.8-107.0 | Remove approximately one minute of disconnected lead-in; retain active session and release. |
| P11 | Performance 18, screen | 45.6-112.0 | Remove setup/black frames; retain active session and release. |
| P02 | Excluded | - | Repeated operator terminal/debugging activity; no clearly uninterrupted representative session selected. |
| P13 | Excluded | - | Stale disconnected Bar 28 piano-roll display throughout sampled timeline; audio does not establish a valid screen demonstration. |
| P15 | Excluded | - | Stale disconnected Bar 28 piano-roll display throughout sampled timeline; audio does not establish a valid screen demonstration. |

Cuts retain the source's opening melody even when the operator briefly switches away from a terminal at the start; cutting to the first visible accompaniment would remove actual performed melody. No middle sections are spliced, no notes are regenerated, and no performance is time-stretched. Short source excerpts are not presented as full songs.

## Two output tiers

- `Source_Resolution/`: camera edits copy original compressed video/audio streams without re-encoding, preserving source dimensions and timestamps. Precisely trimmed screen edits use H.264 CRF 16 at source dimensions and nominal frame rate, with source audio copied; these screen edits are high quality, not mathematically lossless video. Untouched source files remain available separately for original-quality uploads.
- Website: H.264 CRF 25 for camera, CRF 23 for screen; height capped at 720 while preserving aspect ratio; no low-resolution source is enlarged. AAC 160 kbps, fast-start MP4 and JPEG posters. A constant downward gain is applied only if the decoded source clip needs peak headroom; each adjustment is recorded in the audit. No normalization upwards, denoising or mixing is applied.
- Both outputs use the same requested frame-aligned source interval. Nominal source rates (30 fps camera, 27/30 fps screen) are retained. Source-copy camera masters retain original timestamp jitter and compressed packet boundaries, so their tail may differ from the exact-cut website version by up to eight frames (under 0.3 seconds). No change of performance speed is intended.
- Processing occurs in a local staging directory before complete verified masters are copied to the archive, avoiding long-running writes directly into OneDrive.

`scripts/v1-reviewed-cuts.json` is the editable cut/decision list. `scripts/prepare-v1-reviewed-videos.py` performs hash checks, exports, complete output decoding, dimension/frame/duration checks and final original-integrity checks. `docs/v1-reviewed-videos-audit.json` records exact frame-aligned cuts, source-relative paths, output hashes, sizes and audio gain. The archive contains its own manifest and the visual/audio review evidence.

No unmatched videos are uploaded to YouTube by this task. No existing website media or original recordings are deleted.

## Delivered files and verification

- Archive: `Sample/StreamMUSE v1/Reviewed_2026-11-07/Source_Resolution/`, 16 masters totaling 321,301,660 bytes. The parent archive contains a manifest, original-file hashes/paths and review evidence.
- Website: `public/media/streammuse/v1/single-view/`, 16 MP4s totaling 61,939,986 bytes (61.94 MB decimal), plus 16 JPEG posters.
- Final frame comparison sampled the exact first frame, midpoint and one second before each clip ends. Corresponding source frames scored at least 0.978 SSIM after common thumbnail scaling. This is a check of visual correspondence/compression, not musical quality. Contact sheets and numerical results are saved under the archive's `Evidence/`.
- All 16 automated tests, changed-component lint and the production build passed. Tests cover published hashes/inventory, exclusions, cut boundaries, original-size master dimensions and website size/frame constraints, plus existing shared playback and v2/MIDI regressions.
- Browser checks covered all 16 new clips, real decoded dimensions, click-to-load behavior, single/paired mutual pause, native timeline seeking, desktop and narrow-screen layouts, and absence of browser console errors. The existing paired control row now wraps on narrow screens to prevent label/button overlap.
- Existing Performance 01/02 assets are unchanged. No new pairs were claimed. No commit, push, deployment or YouTube upload was performed.
