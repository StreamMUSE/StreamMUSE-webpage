# Evaluation validation

## Single accompaniment-quality score (2026-09-12)

- Rubric `accompaniment-quality-v1` collects exactly three integer scores per round, one for A/B/C; ties are accepted and ranking is removed. Five anchors address melody fit, mechanical repetition, and appropriate changes. Audio files, assignments, MIDI visualization and independent volume controls are unchanged.
- All 24 tests passed with the real local PostgreSQL database and HTTP server enabled, with no skips. Checks cover current and historical CSV mappings, three-score validation, SQL constraints, concurrent retries, conflicting submissions, ten-round continuation, and rejection of retired rubric sessions without modifying their saved responses. Type checking, lint and the production build passed; the evaluation page remains static with dynamic submission routes.
- Browser verification at desktop and 390 × 844: five compact choices per sample with no horizontal overflow, full shared guide, selected descriptions, restoring a draft after reload, equal-score submission, restoring a saved round, and advancing to round two with all three scores cleared.
- Migration 003 was applied to the existing Neon Preview branch. All six historical responses were verified unchanged by count and a digest of their full rows. The new table stores only quality ratings; historical ratings and ranks remain in their original table.
- Production migration 003 remains pending before a future merge/release. No production credentials were obtained or production data changed in this update.

## Earlier validation history

The entries below describe earlier revisions and their then-current rubrics/audio. See the current evaluation README for the active study.

## Local verification

- All 100 source MIDI SHA-256 values matched `_metadata/file_index.csv` and the original sample files.
- Final asset set: 10 reference melodies and 90 generated results, with exactly seeds 0/1/2 for v0/v1/v2 in each song.
- All MP3 hashes matched the final manifest/audit. Maximum synthesis peak: 0.185166 (well below full scale).
- The source MIDI timeline is preserved with a common three-second release window. Final durations: 60.865–133.721 seconds. Maximum discarded renderer-tail peak: 0.0000729994 (approximately −82.7 dBFS); no audible musical tail was removed.
- All 1,620 song/seed/order combinations are reachable, with independent seed selection and one occurrence of each system per session.
- Eight tests passed with no skips when both local PostgreSQL and the running local API were enabled. They cover data integrity, public projection, score/rank validation, proxy-origin handling, database constraints, concurrent submissions, idempotent retries, changed-answer conflicts and CSV mapping.
- `npm run typecheck`, `npm run lint` and `npm run build` passed. Next.js classified `/versions/v2/evaluate` as static and the three API routes as dynamic.
- The production client chunks contained no source filenames, seed mapping or source SHA metadata.

## Browser checks

- Desktop scoring cards and a 390 × 844 phone viewport were inspected. Phone document width remained 390 px; no horizontal page overflow.
- All nine scores began unselected. All five verbal anchors were visible. Arrow keys changed a score with a visible focus ring.
- Reload restored the same four audio sources, chosen score and ranking. Used ranking options were disabled in the other positions.
- Native audio loaded successfully and supported play, pause, seek and replay. Starting Sample A during Sample B playback paused B.
- A real local PostgreSQL outage during submission produced an error without success. All nine scores and the full ranking remained selected.
- Restarting that isolated database and retrying succeeded. The database contained exactly one matching browser response, with all nine scores and ranking matching the form. Reload retained the completion state.
- The local export script produced a CSV containing completed responses only; browser answers were compared against stored data.

## Cloud setup

- Neon resource: `streammuse-evaluation`; project ID `patient-union-53402244`.
- Migration `001_evaluation.sql` was applied to the initially empty production database. Both study tables were verified to contain zero rows.
- All three Vercel website projects are connected to this resource: `stream-muse-webpage`, `stream-muse-webpage-7tns`, `stream-muse-webpage-8ytb`.
- The third project's connection was added with Production and Preview environments, Preview database branching, `DATABASE` variable prefix, and Sensitive enabled.
- Commit `ba29cc27e5a357e84db6f71f723a020c1dad6bb2` built successfully in all three Vercel projects. Their integration provisioning points to the same independent Neon branch `preview/codex/v2-listening-evaluation` (`br-aged-boat-awbtvqmk`). Production uses the separate `main` database branch.
- A real browser evaluation on `stream-muse-webpage-8ytb-kk3486oev.vercel.app` successfully created a session, loaded the final four audio files and saved nine scores plus ranking. Reload retained completion. Exporting that Preview database produced exactly one completed response; its scores, display/system mapping, assets, seeds and ranking were verified against the browser and catalog.
- Production was queried again after the Preview test: zero sessions and zero responses. No test answers were inserted into production.
- The actual user project also passed type checking and a fresh production build after regenerating its old local dependencies/build cache. Its pre-existing `LICENSE`, `next.config.js` and `tailwind.config.js` deletions and `.agent` directory were preserved.

Review entry: [primary project Preview](https://stream-muse-webpage-git-ae4ef9-stanley-zhengs-projects-08a97b0e.vercel.app/versions/v2/evaluate). The feature branch is `codex/v2-listening-evaluation`; production release remains a separate merge into `main`.


## Balanced mix and synchronized piano roll (2026-09-08)

- Playback-v2 contains 100 newly rendered recordings with fixed linear melody/accompaniment gains of 1.0/0.4 (−7.96 dB on accompaniment), no per-file normalization. Original tempo, note timing, velocity and controller events are preserved in separately rendered stems. All 100 playback-v1 recordings retain their original hashes and URLs; their catalog and audit are archived in `history`.
- Maximum new mix peak: 0.125607. Maximum discarded tail peak: 0.0000729994. The common three-second piano release is retained. The 100 current note files contain 36,602 notes and total approximately 3.9 MiB; each listener loads four assigned files only. All samples for one melody share a pitch range, timeline and 12-second viewing window.
- All 12 automated tests passed with local PostgreSQL and the running API enabled, no skips. Added coverage includes tempo changes and sustain in stem splitting, seek boundaries, anonymous note data, historical asset preservation and real HTTP access to assigned audio/JSON resources. Type checking and lint passed without errors or warnings.
- Browser checks passed at desktop and 390 × 844: audio-clock animation and active-note outlines, five-second keyboard seeking, pointer seeking, Home/End, exclusive playback, draft/asset restoration, and four responsive canvases without horizontal overflow.
- Temporarily removing one local note file showed a retry message while retaining the audio controls and selected score. Restoring the file and pressing Retry note view recovered all four canvases. End seeking follows the browser's actual media duration.
- Existing sessions deliberately retain their original recording. Use a fresh deployment URL/origin when reviewing the new mix, so an earlier browser draft does not restore playback-v1.


## Continuous participation and −12 dB accompaniment (2026-09-08)

- Playback-v3 retains melody gain 1.0 and uses accompaniment gain 10^(−12/20) = 0.251188643150958. All 100 new recordings use this common balance; the 200 historical recordings and their note data remain available. The MIDI source events and note-view behavior are unchanged.
- Migration 002 adds anonymous participants and nullable participant/round columns for legacy compatibility. Unique indexes and participant-row transaction locks protect song/round allocation across tabs, requests and deployments. Preview and production were migrated; production session/response counts remained zero before and after migration.
- All 15 tests passed against local PostgreSQL and the running API with no skips. New tests complete ten unique songs, exercise eight concurrent Next requests per round, replay stale/lost-response requests, check separate participants, verify legacy continuation and confirm participant/round CSV columns. Type checking, lint and production build passed.
- Browser checks: a successful first round showed a Next button and 1/10 progress; round two loaded a different reference and cleared all nine scores, ranking and audio positions. Closing and reopening the tab restored round two and its selected score. Submitting round two in a 390 × 844 viewport showed 2/10 progress without horizontal overflow.
- A local database outage during Next showed a recoverable error while retaining the saved two-round progress. Restarting the local database and retrying entered round three with blank scores/ranking and two completed rounds. No production test answers were inserted.
