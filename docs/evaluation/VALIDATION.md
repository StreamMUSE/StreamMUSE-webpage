# Evaluation validation — 2026-09-08

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
