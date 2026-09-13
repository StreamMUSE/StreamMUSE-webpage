import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import catalogData from '../src/data/evaluation-catalog.json'
import { assignSamples, type Catalog } from '../src/lib/evaluation/model'
import { evaluationRepository } from '../src/lib/evaluation/repository'
import { rubricVersion } from '../src/lib/evaluation/rubric'

const url = process.env.EVALUATION_TEST_DATABASE_URL
const base = process.env.EVALUATION_TEST_BASE_URL

test('old rubric answers remain intact; current APIs reject old recovery, adoption and submission', { skip: !url || !base }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url!).hostname))
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base!).hostname))
  const sql = postgres(url!, { max: 1 })
  const catalog = catalogData as Catalog
  const participant = randomUUID(), newParticipant = randomUUID(), id = randomUUID(), unfinishedId = randomUUID()
  const ratings = { A: { coherence: 1, plausibility: 2, musicality: 3 }, B: { coherence: 3, plausibility: 4, musicality: 5 }, C: { coherence: 5, plausibility: 1, musicality: 2 } }
  const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base! }, body: JSON.stringify(body) })
  try {
    const fixture = evaluationRepository(sql)
    await fixture.next(participant, id, null, catalog, 'beat-h2-accompaniment-v1', () => 0, base!)
    await fixture.create(unfinishedId, catalog.datasetVersion, 'beat-h2-accompaniment-v1', assignSamples(catalog, () => 0), base!)
    await sql`INSERT INTO evaluation_responses (session_id, ratings, ranking) VALUES (${id}, ${sql.json(ratings)}, '["C","A","B"]')`
    const original = await sql`SELECT * FROM evaluation_responses WHERE session_id = ${id}`
    const responses = [
      await fetch(`${base}/api/evaluation-sessions/${id}`),
      await fetch(`${base}/api/evaluation-participants/${participant}`),
      await post('/api/evaluation-sessions', { sessionId: unfinishedId }),
      await post('/api/evaluation-rounds', { participantId: participant, sessionId: randomUUID(), previousSessionId: id }),
      await post('/api/evaluation-rounds', { participantId: newParticipant, sessionId: randomUUID(), previousSessionId: unfinishedId }),
      await post('/api/evaluations', { sessionId: unfinishedId, ratings: { A: { quality: 3 }, B: { quality: 3 }, C: { quality: 3 } }, ranking: ['A', 'B', 'C'] }),
    ]
    for (const response of responses) {
      assert.equal(response.status, 410)
      assert.match((await response.json()).error, /scoring guide has changed/)
    }
    assert.equal((await post('/api/evaluations', { sessionId: id, ratings, ranking: ['C', 'A', 'B'] })).status, 400)
    assert.deepEqual(await sql`SELECT * FROM evaluation_responses WHERE session_id = ${id}`, original)
    assert.equal((await sql`SELECT * FROM evaluation_quality_responses WHERE session_id IN (${id}, ${unfinishedId})`).length, 0)
    const fresh = await (await post('/api/evaluation-rounds', { participantId: newParticipant, sessionId: randomUUID(), previousSessionId: null })).json()
    assert.equal(fresh.round, 1); assert.equal(fresh.completed, 0)
    assert.equal(fresh.session.rubricVersion, rubricVersion)
  } finally {
    await sql`DELETE FROM evaluation_responses WHERE session_id = ${id}`
    await sql`DELETE FROM evaluation_sessions WHERE id IN (${id}, ${unfinishedId}) OR participant_id = ${newParticipant}`
    await sql`DELETE FROM evaluation_participants WHERE id IN (${participant}, ${newParticipant})`
    await sql.end()
  }
})
