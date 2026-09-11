import type { Sql, TransactionSql } from 'postgres'
import { assignSamples, publicSession, EvaluationError, type Answers, type Assignment, type StoredSession, type Catalog, type PublicStudy } from './model'

type StudyRow = StoredSession & { submitted: boolean }
async function studyRows(sql: Sql | TransactionSql, participantId: string): Promise<StudyRow[]> {
  const rows = await sql`SELECT s.*, EXISTS (SELECT 1 FROM evaluation_responses r WHERE r.session_id = s.id) AS submitted
    FROM evaluation_sessions s WHERE participant_id = ${participantId} ORDER BY round_number`
  return rows as unknown as StudyRow[]
}
function studyView(rows: StudyRow[], total: number): PublicStudy {
  const last = rows[rows.length - 1]
  return { session: last ? publicSession(last, last.submitted) : null,
    completed: rows.filter(row => row.submitted).length, total, round: last?.round_number ?? 0 }
}

export function evaluationRepository(sql: Sql, activeDataset?: string) {
  const requireCurrent = (dataset: string, expected = activeDataset) => {
    if (expected && dataset !== expected) throw new EvaluationError(410, 'These recordings have been replaced. Reload the listening page to start the updated study.')
  }
  return {
    async study(participantId: string, total: number) {
      if (!(await sql`SELECT id FROM evaluation_participants WHERE id = ${participantId}`).length) {
        throw new EvaluationError(404, 'No listening progress has been saved yet.')
      }
      const rows = await studyRows(sql, participantId)
      rows.forEach(row => requireCurrent(row.dataset_version))
      return studyView(rows, total)
    },
    async next(participantId: string, requestId: string, previousId: string | null,
      catalog: Catalog, rubric: string, randomInt: (max: number) => number, origin: string | null): Promise<PublicStudy> {
      return sql.begin(async tx => {
        await tx`INSERT INTO evaluation_participants (id) VALUES (${participantId}) ON CONFLICT DO NOTHING`
        // One transition per participant at a time, even across tabs or deployments.
        await tx`SELECT id FROM evaluation_participants WHERE id = ${participantId} FOR UPDATE`
        let rows = await studyRows(tx, participantId)
        rows.forEach(row => requireCurrent(row.dataset_version, catalog.datasetVersion))
        const existing = await tx`SELECT participant_id, dataset_version FROM evaluation_sessions WHERE id = ${requestId}`
        if (existing.length) {
          if (existing[0].participant_id !== participantId) throw new EvaluationError(409, 'This round belongs to a different listening session.')
          requireCurrent(existing[0].dataset_version, catalog.datasetVersion)
          return studyView(rows, catalog.songs.length)
        }
        if (previousId && !rows.some(row => row.id === previousId)) {
          // Knowledge of the legacy UUID is the existing recovery authorization.
          const legacy = await tx`SELECT s.*, EXISTS (SELECT 1 FROM evaluation_responses r WHERE r.session_id = s.id) AS submitted
            FROM evaluation_sessions s WHERE id = ${previousId} FOR UPDATE`
          if (!legacy.length) throw new EvaluationError(404, 'The previous round could not be found.')
          if (legacy[0].participant_id || rows.length) throw new EvaluationError(409, 'This round belongs to a different listening session.')
          requireCurrent(legacy[0].dataset_version, catalog.datasetVersion)
          if (!legacy[0].submitted) throw new EvaluationError(409, 'Submit the current round before continuing.')
          await tx`UPDATE evaluation_sessions SET participant_id = ${participantId}, round_number = 1 WHERE id = ${previousId}`
          rows = await studyRows(tx, participantId)
        }
        const last = rows[rows.length - 1]
        // Stale Next requests and retries return the active/latest round without advancing.
        if (last && (!last.submitted || last.id !== previousId)) return studyView(rows, catalog.songs.length)
        const unseen = catalog.songs.filter(song => !rows.some(row => row.song_id === song.id))
        if (!unseen.length || rows.length >= catalog.songs.length) return studyView(rows, catalog.songs.length)
        const assignment = assignSamples({ ...catalog, songs: unseen }, randomInt)
        await tx`INSERT INTO evaluation_sessions (id, dataset_version, rubric_version, song_id, assignment, source_origin, participant_id, round_number)
          VALUES (${requestId}, ${catalog.datasetVersion}, ${rubric}, ${assignment.songId}, ${tx.json(assignment)}, ${origin}, ${participantId}, ${rows.length + 1})`
        return studyView(await studyRows(tx, participantId), catalog.songs.length)
      })
    },
    async create(id: string, dataset: string, rubric: string, assignment: Assignment, origin: string | null) {
      // Client-generated UUID makes creation recoverable even if its response is lost.
      await sql`INSERT INTO evaluation_sessions (id, dataset_version, rubric_version, song_id, assignment, source_origin)
        VALUES (${id}, ${dataset}, ${rubric}, ${assignment.songId}, ${sql.json(assignment)}, ${origin}) ON CONFLICT (id) DO NOTHING`
      return this.get(id)
    },
    async get(id: string): Promise<{ session: StoredSession; submitted: boolean }> {
      const rows = await sql`SELECT s.*, EXISTS (SELECT 1 FROM evaluation_responses r WHERE r.session_id = s.id) AS submitted
        FROM evaluation_sessions s WHERE s.id = ${id}`
      if (!rows.length) throw new EvaluationError(404, 'This evaluation could not be found. Please try restoring it again.')
      requireCurrent(rows[0].dataset_version)
      return { session: rows[0] as unknown as StoredSession, submitted: rows[0].submitted }
    },
    async submit(id: string, answers: Answers) {
      if (activeDataset) await this.get(id)
      // Separate statements are intentional: after a concurrent INSERT wins, the following
      // SELECT gets a fresh READ COMMITTED snapshot and sees the winning response.
      const inserted = await sql`INSERT INTO evaluation_responses (session_id, ratings, ranking)
        SELECT id, ${sql.json(answers.ratings)}, ${sql.json(answers.ranking)} FROM evaluation_sessions WHERE id = ${id}
        ON CONFLICT (session_id) DO NOTHING RETURNING submitted_at`
      if (inserted.length) return { submitted: true, submittedAt: inserted[0].submitted_at, duplicate: false }
      const rows = await sql`SELECT submitted_at, (ratings = ${sql.json(answers.ratings)}::jsonb AND ranking = ${sql.json(answers.ranking)}::jsonb) AS identical
        FROM evaluation_responses WHERE session_id = ${id}`
      if (!rows.length) throw new EvaluationError(404, 'This evaluation could not be found. Your answers are still saved in this browser.')
      if (!rows[0].identical) throw new EvaluationError(409, 'This evaluation has already been submitted with different answers. The saved submission has been kept.')
      return { submitted: true, submittedAt: rows[0].submitted_at, duplicate: true }
    },
  }
}
