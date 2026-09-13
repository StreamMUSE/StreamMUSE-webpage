# StreamMUSE listening evaluation

The static page at `/versions/v2/evaluate` compares three anonymous accompaniment results for one randomly selected melody. Next.js API routes save the assignment and answers in PostgreSQL. The v2 page links to the study. No participant account is required.

## Dataset and rubric

`src/data/evaluation-catalog.json` is the server-side catalog. It contains ten songs, one reference melody per song, and three seeds for each of three systems:

| System | Playback MIDI files | Configuration |
| --- | --- | --- |
| v0 | `legacy_m2a_s0/s1/s2.mid` | Legacy M2A, I=4 ticks, GL=7 interleaved frames |
| v1 | `lekai_no_prompt_s0/s1/s2.mid` | Pure Lekai without a Prompt Model |
| v2 | `pc_rule_if_else_n10_s0/s1/s2.mid` | Fixed P+C Rule If-Else N=10; tonal constraint and empty-token guard enabled |

Source: `ISMIR_LBD_202609010` (the folder name includes the extra zero), using all ten named song folders. Each contains `00_melody.mid` and nine combined playback MIDIs. The `_raw` folders are excluded because raw P+C contains prompts that were not played. The original playback timing, velocities, rests and ending are preserved. The collection README identifies the fixed P+C outputs as version `660f363b`, including beat-tail request and unified Stop fixes; pure Lekai and Legacy use the completed baseline outputs in this new collection. These files replace the September 7 playback set. Seven pure-Lekai playback files have no accompaniment notes in the supplied MIDI and remain in the pool unchanged: song 01 seeds 0/1, song 05 seed 1, song 08 seed 0, song 09 seeds 0/1, and song 10 seed 1. All 30 P+C playback files contain accompaniment notes.

Dataset version: `ismir-lbd-202609010-playback-v1`. Rubric version: `accompaniment-quality-v1`.

Each sample receives one **Accompaniment quality** integer score from 1 to 5, for three scores per round. There is no ranking and equal scores are allowed. The question is how naturally and appropriately the accompaniment supports the melody. Every level in `src/lib/evaluation/rubric.ts` considers melody fit and whether repetition and changes respond to its development. Appropriate repetition is not penalized; more variation alone does not earn a higher score. The full guide appears once above the samples; selecting a score repeats its description below the buttons. This is a study-specific single criterion, not the earlier BEAT three-dimension rubric.

Migration `003_accompaniment_quality.sql` adds `evaluation_quality_responses` without changing the historical nine ratings or rankings in `evaluation_responses`. New APIs reject earlier rubric sessions with HTTP 410, and browser keys include both dataset and rubric versions. Returning listeners start a new ten-song study; old drafts and answers are not converted, adopted or erased. The audio and dataset version are unchanged by this rubric update. Analyze cohorts separately by both `dataset_version` and `rubric_version`. Use a new version for future substantive changes to anchors or audio.

## Audio preparation

The 100 current recordings in `public/media/evaluation` each provide a combined MP3, two stereo stem MP3s, and a piano-roll JSON, all with opaque resource IDs. They are pre-rendered and served as static files. No model or MIDI synthesizer runs when a participant visits.

Prerequisites: Node.js 20.12+ (Next.js requires 20.9+), FluidSynth, FFmpeg including ffprobe, and MuseScore's MS Basic soundfont. Install project dependencies with `npm ci`, then:

```sh
npm run evaluation:audio -- '/path/to/ISMIR_LBD_202609010' '/Applications/MuseScore 4.app/Contents/Resources/sound/MS Basic.sf3'
```

Rendering uses the same MS Basic soundfont checksum, 44.1 kHz stereo, fixed FluidSynth gain 0.3, no chorus/reverb, polyphony 512 and MP3 VBR quality 3 for every file. Melody and accompaniment are rendered as separate stems, preserving the original MIDI track events and tempo map, then mixed with linear gains of 1.0 and 0.251188643150958 respectively (accompaniment −12 dB). There is no per-file normalization or compression. Each player starts at melody 0 dB and accompaniment −12 dB, matching the fixed mix. Listeners may independently adjust either role from −40 to +6 dB, mute it, or reset both roles to their defaults; adjusting a slider also unmutes that role. The reference only exposes its melody control. Gain changes are smoothed over 15 ms. Settings stay with that player while switching between A/B/C and return to defaults on reload or the next song; settings are not included in submitted answers. The same mix applies to all three systems and every seed. Track names `Guitar`/`Piano` in v0 map to melody/accompaniment; both still use the piano soundfont. Empty accompaniment remains silent. The full MIDI timeline, including its end-of-track event, is retained, followed by three seconds of piano release. Any additional renderer waiting time is removed only after verifying its peak is below 0.0005 (about −66 dBFS). This removes the renderer's long silent padding on song 03 without changing note timing or cutting musical content. `audio-audit.json` records source/audio/visualization hashes, track note counts, duration, mix peak/RMS, pre-gain stem peak/RMS and discarded-tail peak; the soundfont license is included. The soundfont itself is not distributed. The preparation script rejects non-piano tracks, silent combined output, clipping risk, audible tails beyond the common release window, and audio shorter than the MIDI. Cached renders are stored in the system temporary directory, keyed by source and render settings.

Browser playback lazily fetches and decodes the two stereo stems only when Play is pressed. They use gain nodes and one shared Web Audio clock, with exactly the same scheduled start time and seek offset. Decoded buffers are released when switching players, leaving only the active recording in memory. A cancelled or replaced load cannot later start playback; failed downloads or interrupted playback can be retried with Play. Both stems use the same encoder, sample rate and full timeline padding; the renderer verifies equal durations and sufficient peak headroom even when both volume controls are at +6 dB. The original combined MP3s remain byte-for-byte unchanged, with stable asset IDs and dataset version, so existing assignments and listener progress continue to work. Stored assignments created before stem URLs were added receive those URLs through the public projection; no database migration is required.

A Canvas piano roll accompanies each of the four players: melody in teal, accompaniment in terracotta, a moving playhead and active-note outlines. Its 12-second window follows the shared audio clock, so seek, pause and replay stay synchronized. Click the roll to seek within the visible window, use arrow keys for five-second steps, Home/End for the endpoints, or use the full-length playback slider. Every seed/system/reference within a song shares the same pitch range and timeline. Note JSON contains only role, pitch, time, duration and velocity; opaque asset paths disclose no filenames, system names or seeds. Only the four assigned note files are loaded. A note-load failure offers retry and leaves audio playback available.

Only the current 100 recordings are published: 100 combined MP3s, 200 stereo stem MP3s and 100 note JSON files. The September 7 recordings, note views and historical catalog/audit files have been removed as requested. The renderer prunes superseded assets after the complete new set has passed validation. Source MIDI folders are not modified. Saved database answers remain associated with their original dataset; current APIs return HTTP 410 for retired assignments instead of returning deleted audio or accepting further scores for it.

The page uses dataset- and rubric-specific localStorage keys for both participation and drafts, so returning listeners start a fresh ten-song study with the new recordings. Earlier browser keys are not loaded. Anonymous IDs are stable within one dataset, rubric and origin, but do not identify the same person across datasets or rubrics. Filter exports by `dataset_version` when analyzing the updated collection. No database migration is required for this sample refresh.

 Starting one player pauses the previous player. Reaching the end is shown as a playback status, not treated as proof of attentive listening. Full listening is not enforced.

## Database setup

Use the existing Neon Free resource `streammuse-evaluation` in the Washington, D.C. region. Neon Auth is not required by this feature and may remain enabled.

1. Connect each Vercel project that serves this repository to Neon. Add `DATABASE_URL` to Production and Preview as a **server-only** variable. Never use a `NEXT_PUBLIC_` prefix. The code uses Postgres.js, including a one-connection pool and idle timeout, with the pooled Neon URL.
2. All production sites may share one database and the same study tables. Each submission records its source origin. Browser drafts remain separate for each origin.
3. Preview and local development must use an independent Neon branch or local database. Enable Preview database branching in the Neon integration. Do not enable a fresh production database branch for every deployment.
4. Apply the migration to production before creating Preview branches, so they inherit the empty study schema. If a Preview branch already exists, migrate that branch separately. Use the selected branch's connection string in an untracked `.env.local` file, or supply `DATABASE_URL` in the command environment.

```sh
npm run db:migrate
```

The migration runner locks and applies numbered SQL files once, verifies checksums on subsequent runs, and runs atomically. API requests never create tables. Production should contain zero study sessions/responses before recruitment; verify this in the Neon console. Existing unrelated tables and Neon Auth tables are unaffected.

The business tables are `evaluation_participants`, `evaluation_sessions`, `evaluation_quality_responses` and the historical `evaluation_responses`. The migration runner adds `evaluation_schema_migrations` to track schema versions. A session stores song, dataset/rubric versions, actual A/B/C mapping, timestamps and participant/round fields. A current response stores three ratings and the server submission time. SQL checks require exactly A/B/C with one integer `quality` value from 1–5 each; the primary key and foreign key enforce one response per existing session. Old response constraints and rows remain intact. Apply all numbered migrations to both the target production database and any existing Preview database before deploying the new API.

## API and recovery

| Endpoint | Behavior |
| --- | --- |
| `POST /api/evaluation-rounds` | Takes UUIDv4 `participantId`, UUIDv4 request `sessionId`, and `previousSessionId` (null for the first round). Restores the active/latest round or, after the current round is submitted, assigns a uniformly selected unseen song. |
| `GET /api/evaluation-participants/{participantId}` | Restores the latest round and authoritative completed/total/round counts. It does not create a new assignment. |
| `POST /api/evaluation-sessions` | Accepts a random UUIDv4 `sessionId`; selects a uniform song, independent uniform seeds and a shuffled A/B/C order. Retrying the same ID restores its original assignment. |
| `GET /api/evaluation-sessions/{sessionId}` | Returns the stored anonymous assets, rubric version and submitted status. Responses are not cached. |
| `POST /api/evaluations` | Accepts `sessionId`, `ratings` shaped as `{ "A": { "quality": 1 }, "B": { "quality": 3 }, "C": { "quality": 5 } }. Validates and atomically inserts one answer. |

The single-round endpoint remains available for the current dataset and rubric; IDs from retired datasets or rubrics return HTTP 410. For the current flow, the browser keeps an anonymous UUID in `streammuse-evaluation-participant-v2:<datasetVersion>:<rubricVersion>` localStorage; it persists across closing and reopening the same browser on the same origin. Clearing site data, a different browser/device/origin or a new private-browsing session creates separate participation. No real-world identity or account is inferred.

Each completed round offers **Listen to the next melody** until ten unique songs are complete. Every round independently selects seeds and shuffles A/B/C. The next round clears the three scores and audio positions, and focuses the reference player. The success screen shows completed progress and allows stopping and returning later. Participant and round identifiers are included in CSV export so repeated measures can be analyzed by listener.

A transaction locks the participant row for each Next request. It returns any active round, validates the previous round, and draws from songs not yet assigned; unique participant/song and participant/round indexes enforce invariants. Retries and stale tabs return the active/latest round without advancing. Completing ten songs does not create an eleventh round. No per-round database DDL runs. A submitted single-round session from the current dataset and rubric can be attached as round one using its recovery UUID; its song is excluded from subsequent rounds. A retired dataset or rubric cannot be adopted into the current study.

The browser creates a cryptographically random request UUID before each Next request and persists a pending transition alongside the previous draft. Lost responses and browser restarts can recover the created round or retry the same request. The old draft is cleared only after the next assignment is confirmed.

The browser creates a cryptographically random UUID before its first request so a lost creation response cannot cause a new assignment on retry. IDs and unfinished answers are saved under `streammuse-listening-evaluation-v2:<datasetVersion>:<rubricVersion>` in local storage. Reloading restores the same session. If browser storage is unavailable, the page asks the participant to keep it open. Network errors preserve all current answers and allow retry. Only confirmed database writes display success.

Identical submissions return the original success timestamp; a different answer for the same session returns HTTP 409 and never overwrites an answer. Database uniqueness covers concurrent clicks and a successful write followed by a lost response. The server trusts its own stored system mapping, never client-supplied version labels. JSON bodies have a 4 KB limit, and supplied cross-origin POST requests are rejected.

The public API does not list answers or offer export. The catalog is imported only by server code; the page passes only its dataset version to the client to select browser storage keys. Session IDs function as unguessable recovery tokens: do not publish them. Anonymous participation prevents duplicate answers for one session, not identification of one human across devices or domains. Each next song is uniform among the participant’s remaining songs; seeds and display order are independently randomized. This does not balance assignments across participants. Asset anonymity is a study presentation measure; publicly available recordings are not guaranteed to be technically unidentifiable.

## Export and backup

With the intended branch's `DATABASE_URL` set, run locally:

```sh
npm run evaluation:export -- /absolute/path/responses-2026-09-08.csv
```

The exporter performs a read-only join and writes one row per completed response, ordered by submission time. It includes participant UUID, round number, song, dataset/rubric, origin, timestamps, display labels, asset IDs, seeds, each system's quality score. Historical response rows retain their three original dimension scores and ranking; new rows leave those columns blank, and historical rows leave quality blank. Filter by rubric version before analysis. Unsubmitted sessions are excluded. CSV quoting and spreadsheet formula escaping are applied. Output files use owner-only permissions and an existing export is never overwritten. Store exports outside the public directory and Git repository. Use Neon SQL Editor for authenticated inspection and make manual backups periodically during collection.

## Validation and deployment

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The pure tests enumerate all 1,620 song/seed/order combinations, verify all 300 audio checksums, exercise shared-clock playback, live gains, mute/reset, seek/replay, load cancellation, memory release, failed-load retry and saved-assignment compatibility, as well as validation/public projection, and check CSV mappings. Real database tests run only when `EVALUATION_TEST_DATABASE_URL` points to localhost. They create and remove a unique isolated schema:

```sh
EVALUATION_TEST_DATABASE_URL=postgresql://USER@127.0.0.1:55432/postgres npm test
```

With the local app running against the test database, `EVALUATION_TEST_BASE_URL=http://127.0.0.1:3008 npm test` also exercises the actual HTTP routes. Database/HTTP tests are skipped unless their explicit local test configuration is provided.

Test the page against that database or a Neon Preview branch: submit three quality scores (including ties), reload midway and after submission, interrupt/retry a request, verify only one database row, and export that row. Check desktop/mobile and keyboard navigation, replay/seek and one-at-a-time audio. Do not use the production database for these tests.

Deploy a feature branch through the existing GitHub → Vercel connection, verify its Preview environment uses a separate Neon branch, and complete a real Preview submission/export comparison. After review, release that commit to the production branch. No `output: 'export'` setting should be added: the page is pre-rendered but the API routes need Vercel Functions. API functions prefer `iad1`, near the database. Audio does not consume database storage; static audio transfer uses Vercel bandwidth.
