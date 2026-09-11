import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import postgres from 'postgres'
import catalogData from '../src/data/evaluation-catalog.json'
import { assignSamples, validateAnswers, type Catalog } from '../src/lib/evaluation/model'
import { evaluationRepository } from '../src/lib/evaluation/repository'
import { flattenResponse, responsesCsv } from '../scripts/evaluation-csv.mjs'

const url = process.env.EVALUATION_TEST_DATABASE_URL
const catalog = catalogData as Catalog
const answers = validateAnswers({ ratings: { A: { coherence: 1, plausibility: 2, musicality: 3 }, B: { coherence: 3, plausibility: 4, musicality: 5 }, C: { coherence: 5, plausibility: 1, musicality: 2 } }, ranking: ['C', 'A', 'B'] })

test('participants complete ten unique songs; concurrent, stale and lost-response Next requests never skip a round', { skip: !url }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url!).hostname))
  const schema = `round_test_${randomUUID().replace(/-/g, '')}`
  const admin = postgres(url!, { max: 1, onnotice: () => {} })
  await admin`CREATE SCHEMA ${admin(schema)}`
  const sql = postgres(url!, { max: 8, connection: { search_path: schema } })
  try {
    for (const file of readdirSync('db/migrations').filter(name => name.endsWith('.sql')).sort()) await sql.unsafe(readFileSync(`db/migrations/${file}`, 'utf8'))
    const repo = evaluationRepository(sql), participant = randomUUID()
    await assert.rejects(repo.study(participant, 10), { status: 404 })
    const next = (id: string, previous: string | null) => repo.next(participant, id, previous, catalog, 'rubric', max => max - 1, 'http://localhost')
    const firstRequest = randomUUID()
    let study = await next(firstRequest, null)
    const firstId = study.session!.id
    assert.equal(study.round, 1); assert.equal(study.completed, 0)
    assert.deepEqual(await next(firstRequest, null), study)
    assert.deepEqual(await next(randomUUID(), study.session!.id), study, 'Cannot advance before submission')
    const seen = new Set<string>()
    for (let round = 1; round <= 10; round++) {
      const id = study.session!.id
      const stored = (await repo.get(id)).session
      assert.equal(stored.participant_id, participant); assert.equal(stored.round_number, round)
      assert.ok(!seen.has(stored.song_id)); seen.add(stored.song_id)
      assert.equal(study.round, round); assert.equal(study.completed, round - 1)
      await repo.submit(id, answers)
      const restored = await repo.study(participant, 10)
      assert.equal(restored.completed, round); assert.equal(restored.session!.submitted, true)
      if (round < 10) {
        const results = await Promise.all(Array.from({ length: 8 }, () => next(randomUUID(), id)))
        assert.equal(new Set(results.map(result => result.session!.id)).size, 1)
        study = results[0]
        assert.notEqual(study.session!.id, id)
        assert.equal(study.round, round + 1)
        assert.deepEqual(await next(firstRequest, null), study, 'A replayed first request returns latest progress')
        if (round > 1) assert.deepEqual(await next(randomUUID(), firstId), study, 'Stale browser tab cannot advance')
      } else {
        study = await next(randomUUID(), id)
        assert.equal(study.completed, 10); assert.equal(study.round, 10); assert.equal(study.session!.id, id)
      }
    }
    assert.equal(seen.size, 10)
    const rows = await sql`SELECT r.*, s.participant_id, s.round_number, s.assignment FROM evaluation_responses r
      JOIN evaluation_sessions s ON s.id = r.session_id WHERE s.participant_id = ${participant} ORDER BY round_number`
    assert.equal(rows.length, 10)
    rows.forEach((row, index) => { const flat = flattenResponse(row); assert.equal(flat.participant_id, participant); assert.equal(flat.round_number, index + 1) })
    assert.ok(responsesCsv(rows).startsWith('participant_id,round_number,session_id,'))
    const reconnect = postgres(url!, { max: 1, connection: { search_path: schema } })
    try { assert.deepEqual(await evaluationRepository(reconnect).study(participant, 10), study) } finally { await reconnect.end() }
    const secondParticipant = randomUUID()
    const second = await repo.next(secondParticipant, randomUUID(), null, catalog, 'rubric', () => 0, null)
    assert.equal(second.round, 1); assert.equal(second.completed, 0)
    await assert.rejects(repo.next(secondParticipant, randomUUID(), firstId, catalog, 'rubric', () => 0, null), { status: 409 })
    const sample = (await repo.get(second.session!.id)).session
    await assert.rejects(sql`INSERT INTO evaluation_sessions (id, dataset_version, rubric_version, song_id, assignment, participant_id, round_number)
      VALUES (${randomUUID()}, 'test', 'test', ${sample.song_id}, ${sql.json(sample.assignment)}, ${secondParticipant}, 2)`, { code: '23505' })
  } finally { await sql.end(); await admin`DROP SCHEMA ${admin(schema)} CASCADE`; await admin.end() }
})

test('a current single-round completion becomes round one and continues on an unseen song', { skip: !url }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url!).hostname))
  const schema = `legacy_test_${randomUUID().replace(/-/g, '')}`
  const admin = postgres(url!, { max: 1, onnotice: () => {} })
  await admin`CREATE SCHEMA ${admin(schema)}`
  const sql = postgres(url!, { max: 3, connection: { search_path: schema } })
  try {
    for (const file of readdirSync('db/migrations').filter(name => name.endsWith('.sql')).sort()) await sql.unsafe(readFileSync(`db/migrations/${file}`, 'utf8'))
    const repo = evaluationRepository(sql), participant = randomUUID(), oldId = randomUUID()
    const oldCatalog = catalog
    const original = await repo.create(oldId, oldCatalog.datasetVersion, 'old-rubric', assignSamples(oldCatalog, () => 0), 'http://localhost')
    const requestId = randomUUID()
    await assert.rejects(repo.next(participant, requestId, oldId, catalog, 'new-rubric', () => 0, null), { status: 409 })
    assert.equal((await repo.get(oldId)).session.participant_id, null)
    await repo.submit(oldId, answers)
    const next = await repo.next(participant, requestId, oldId, catalog, 'new-rubric', () => 0, null)
    assert.equal(next.round, 2); assert.equal(next.completed, 1)
    const linked = (await repo.get(oldId)).session
    assert.equal(linked.participant_id, participant); assert.equal(linked.round_number, 1)
    assert.deepEqual(linked.assignment, original.session.assignment)
    assert.equal(linked.dataset_version, oldCatalog.datasetVersion)
    const fresh = (await repo.get(next.session!.id)).session
    assert.notEqual(fresh.song_id, linked.song_id); assert.equal(fresh.dataset_version, catalog.datasetVersion)
    assert.deepEqual(await repo.next(participant, requestId, oldId, catalog, 'new-rubric', () => 0, null), next)
    await assert.rejects(repo.next(randomUUID(), randomUUID(), oldId, catalog, 'new-rubric', () => 0, null), { status: 409 })
    assert.equal((await repo.get(oldId)).submitted, true)
  } finally { await sql.end(); await admin`DROP SCHEMA ${admin(schema)} CASCADE`; await admin.end() }
})

const base = process.env.EVALUATION_TEST_BASE_URL
test('retired study APIs reject recovery, adoption and submission without changing saved answers', { skip: !base || !url }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base!).hostname))
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url!).hostname))
  const sql = postgres(url!, { max: 1 })
  const oldParticipant = randomUUID(), newParticipant = randomUUID(), oldId = randomUUID(), unsubmittedId = randomUUID()
  const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base! }, body: JSON.stringify(body) })
  try {
    const fixture = evaluationRepository(sql)
    const oldCatalog = { ...catalog, datasetVersion: 'retired-test-dataset' }
    await fixture.next(oldParticipant, oldId, null, oldCatalog, 'rubric', () => 0, base!)
    await fixture.submit(oldId, answers)
    await fixture.create(unsubmittedId, oldCatalog.datasetVersion, 'rubric', assignSamples(catalog, () => 0), base!)
    const original = await sql`SELECT * FROM evaluation_responses WHERE session_id = ${oldId}`
    const responses = [
      await fetch(`${base}/api/evaluation-sessions/${oldId}`),
      await fetch(`${base}/api/evaluation-participants/${oldParticipant}`),
      await post('/api/evaluation-sessions', { sessionId: oldId }),
      await post('/api/evaluation-rounds', { participantId: oldParticipant, sessionId: randomUUID(), previousSessionId: oldId }),
      await post('/api/evaluation-rounds', { participantId: newParticipant, sessionId: randomUUID(), previousSessionId: unsubmittedId }),
      await post('/api/evaluations', { sessionId: unsubmittedId, ...answers }),
    ]
    for (const response of responses) {
      assert.equal(response.status, 410)
      const result = await response.json()
      assert.match(result.error, /recordings have been replaced/)
      assert.ok(!JSON.stringify(result).includes('/media/'))
    }
    assert.deepEqual(await sql`SELECT * FROM evaluation_responses WHERE session_id = ${oldId}`, original)
    assert.equal((await sql`SELECT * FROM evaluation_responses WHERE session_id = ${unsubmittedId}`).length, 0)
  } finally {
    await sql`DELETE FROM evaluation_responses WHERE session_id IN (${oldId}, ${unsubmittedId})`
    await sql`DELETE FROM evaluation_sessions WHERE id IN (${oldId}, ${unsubmittedId})`
    await sql`DELETE FROM evaluation_participants WHERE id IN (${oldParticipant}, ${newParticipant})`
    await sql.end()
  }
})

test('round APIs keep participant progress through ten submissions and reject invalid requests', { skip: !base }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base!).hostname))
  const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base! }, body: JSON.stringify(body) })
  const participantId = randomUUID()
  assert.equal((await fetch(`${base}/api/evaluation-participants/${participantId}`)).status, 404)
  assert.equal((await post('/api/evaluation-rounds', { participantId, sessionId: randomUUID() })).status, 400)
  assert.equal((await post('/api/evaluation-rounds', { participantId: 'bad', sessionId: randomUUID(), previousSessionId: null })).status, 400)
  let previousSessionId: string | null = null
  const references = new Set<string>()
  for (let round = 1; round <= 10; round++) {
    const body: { participantId: string; sessionId: string; previousSessionId: string | null } = { participantId, sessionId: randomUUID(), previousSessionId }
    const response = await post('/api/evaluation-rounds', body)
    assert.equal(response.status, 200)
    const study = await response.json()
    assert.equal(study.round, round); assert.equal(study.completed, round - 1)
    assert.deepEqual(await (await post('/api/evaluation-rounds', body)).json(), study)
    assert.ok(!references.has(study.session.reference.id)); references.add(study.session.reference.id)
    assert.equal((await post('/api/evaluations', { sessionId: study.session.id, ...answers })).status, 200)
    const restore = await fetch(`${base}/api/evaluation-participants/${participantId}`)
    assert.equal(restore.headers.get('cache-control'), 'no-store')
    const saved = await restore.json()
    assert.equal(saved.completed, round); assert.equal(saved.session.submitted, true)
    previousSessionId = study.session.id
  }
  const complete = await (await post('/api/evaluation-rounds', { participantId, sessionId: randomUUID(), previousSessionId })).json()
  assert.equal(complete.completed, 10); assert.equal(complete.round, 10); assert.equal(complete.session.id, previousSessionId)
})
