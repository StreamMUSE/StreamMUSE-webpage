# v2 MIDI examples

`/versions/v2#midi` contains ten song rows and three sample columns. Sample 1, 2 and 3 correspond to seeds 0, 1 and 2 of `pc_rule_if_else_n10` in `ISMIR_LBD_202609010`. These are the playback MIDI files used in the listening evaluation, not the raw generation outputs.

Each card contains a piano-roll preview, audio playback with seeking and restart, and the original MIDI download. Teal notes indicate melody; amber notes indicate accompaniment. The three previews in a row share the same pitch range and time scale. Small notes have a minimum visual size for legibility. On narrow screens the three cards stack beneath their song heading.

The page uses one shared audio element. Audio loads only when a visitor clicks Play, and selecting another card stops the previous recording. Playback uses exactly the same combined MP3 bytes as the evaluation: melody at 0 dB and accompaniment at −12 dB. This static gallery does not require the evaluation routes or a database.

## Assets and regeneration

`public/media/streammuse/v2/midi-examples/` contains 30 MIDI files, 30 MP3 files and 30 SVG piano rolls. `src/data/v2-midi-examples.json` defines their order and URLs. `docs/v2-midi-examples-audit.json` records source filenames and asset SHA-256 hashes.

To regenerate from the original collection and a checkout containing the prepared evaluation assets:

```sh
node scripts/prepare-v2-midi-examples.mjs /path/to/ISMIR_LBD_202609010 /path/to/evaluation-checkout
npm test
```

The script verifies each source MIDI hash against the evaluation catalog, copies MIDI and audio without re-encoding, and draws previews from the corresponding evaluation note data. No source folders, credentials or audio synthesis tools are required when building or serving the website.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The asset tests check all ten rows, seed mappings, every published file against its recorded hash, and MIDI note timing against audio duration. Check playback, pause, seeking, switching samples, error recovery and mobile layout in a browser when changing the gallery player.
