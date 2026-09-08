import type { Sql } from 'postgres'
import { EvaluationError, type Answers, type Assignment, type StoredSession } from './model'

export function evaluationRepository(sql: Sql) {
  return {
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
      return { session: rows[0] as unknown as StoredSession, submitted: rows[0].submitted }
    },
    async submit(id: string, answers: Answers) {
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
