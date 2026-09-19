# MIDI comparison gallery

`/versions/v2#midi` contains ten song groups. Each group has three system rows and three sample columns (seeds 0, 1, 2):

- StreamMUSE: `legacy_m2a`
- StreamMUSE+ (w/o PM): `lekai_no_prompt`
- StreamMUSE+: `pc_rule_if_else_n10`

All 90 source MIDI files are the playback exports in `ISMIR_LBD_202609010`, verified against the evaluation catalog; raw generation files are excluded. Seven prompt-free samples have no generated accompaniment. They remain present with an explicit card note, rather than being replaced with another take.

Card backgrounds use mist blue, lavender, and pale rose, with a system legend at the top. Piano-roll backgrounds are transparent so the tint remains visible. Teal notes always mean melody and amber notes always mean accompaniment. All nine cards for a song share the same pitch range and time scale. The system names are announced by screen readers and available in card titles, without taking up a left-hand column.

The first song starts expanded; other songs can be expanded individually or all at once. At widths of 600px and below, each system shows one card and a Sample 1 / 2 / 3 selector. Collapsing the active song or changing its mobile sample pauses playback.

## Playback

One active `StemPlayer` loads two stereo stems only after Play is pressed. It schedules both on the same Web Audio clock, using the same offset for start, resume, and seeking. Switching samples disposes the previous player, cancels pending downloads, and releases decoded PCM. Demo videos and the gallery pause one another via the existing media-playback event.

Global melody and accompaniment volume controls apply to every system and persist while switching songs/samples. Defaults remain 0 dB melody / −12 dB accompaniment. Gain and mute updates do not restart playback. Original stem bytes are copied from the evaluation preparation; no new synthesizer, normalization, or MIDI modification is applied. The gallery has no evaluation API or database dependency.

## Assets and regeneration

The generated asset folder contains 90 MIDI files, 90 SVG piano rolls, and 134 unique MP3 stems. Identical audio is deduplicated by SHA-256, while the audit retains source mappings for every sample. Existing StreamMUSE+ MIDI download URLs are preserved. Old combined MP3s have been replaced with adjustable stems.

```sh
node scripts/prepare-v2-midi-examples.mjs /path/to/ISMIR_LBD_202609010 /path/to/evaluation-checkout
npm run lint
npm run typecheck
npm test
npm run build
```

The preparation script checks all source hashes and matching stem lengths before publishing assets. `docs/v2-midi-examples-audit.json` records original filenames, system mapping, seeds, hashes, note counts, shared pitch ranges, durations, and stem peak levels. Tests verify complete coverage, exact output hashes, silent outputs, headroom at +6 dB, synchronized scheduling, seeking, volume changes, cancellation, disposal, and error recovery.

Check actual browser playback, cross-media pausing, mobile selectors, collapse behavior, and the rendered three-color layout when changing the gallery.
