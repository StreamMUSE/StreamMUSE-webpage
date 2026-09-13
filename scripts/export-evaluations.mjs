import { writeFile } from 'node:fs/promises'
import { connect } from './evaluation-db.mjs'
import { responsesCsv } from './evaluation-csv.mjs'

const destination = process.argv[2]
if (!destination || !destination.endsWith('.csv')) {
  console.error('Usage: npm run evaluation:export -- /path/to/responses.csv')
  process.exit(1)
}
const sql = connect()
try {
  const rows = await sql`SELECT s.participant_id, s.round_number, r.session_id, s.dataset_version, s.rubric_version, s.song_id, s.source_origin,
    s.assignment, s.created_at, r.ratings, r.ranking, r.submitted_at
    FROM (
      SELECT session_id, ratings, ranking, submitted_at FROM evaluation_responses
      UNION ALL
      SELECT session_id, ratings, NULL::jsonb AS ranking, submitted_at FROM evaluation_quality_responses
    ) r JOIN evaluation_sessions s ON s.id = r.session_id ORDER BY r.submitted_at, r.session_id`
  await writeFile(destination, responsesCsv(rows), { flag: 'wx', mode: 0o600 })
  console.log(`Exported ${rows.length} completed evaluations to ${destination}.`)
} catch (error) {
  console.error('Export failed:', error.code || error.name)
  process.exitCode = 1
} finally { await sql.end() }
