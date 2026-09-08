import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import catalogData from '../src/data/evaluation-catalog.json'
import { assignSamples, validateAnswers, type Catalog } from '../src/lib/evaluation/model'
import { evaluationRepository } from '../src/lib/evaluation/repository'
import { flattenResponse } from '../scripts/evaluation-csv.mjs'

const url = process.env.EVALUATION_TEST_DATABASE_URL
test('real PostgreSQL: restore, constraints, concurrent retries, conflicts and export mapping', { skip: !url }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url!).hostname), 'Use an isolated LOCAL test database, never production.')
  const schema = `evaluation_test_${randomUUID().replace(/-/g, '')}`
  const admin = postgres(url!, { max: 1 })
  await admin`CREATE SCHEMA ${admin(schema)}`
  const sql = postgres(url!, { max: 8, connection: { search_path: schema } })
  try {
    await sql.unsafe(readFileSync('db/migrations/001_evaluation.sql', 'utf8'))
    const repo = evaluationRepository(sql)
    const assignment = assignSamples(catalogData as Catalog, () => 0)
    const id = randomUUID()
    const first = await repo.create(id, 'dataset', 'rubric', assignment, 'http://localhost')
    assert.equal(first.submitted, false)
    const recreated = await repo.create(id, 'changed', 'changed', assignSamples(catalogData as Catalog, max => max - 1), null)
    assert.deepEqual(recreated.session.assignment, first.session.assignment)
    assert.equal(recreated.session.dataset_version, 'dataset')
    await assert.rejects(repo.get(randomUUID()), { status: 404 })
    const answers = validateAnswers({ ratings: { A: { coherence: 1, plausibility: 2, musicality: 3 }, B: { coherence: 3, plausibility: 4, musicality: 5 }, C: { coherence: 5, plausibility: 1, musicality: 2 } }, ranking: ['C', 'B', 'A'] })
    const submissions = await Promise.all(Array.from({ length: 12 }, () => repo.submit(id, answers)))
    assert.equal(submissions.filter(result => !result.duplicate).length, 1)
    assert.equal(new Set(submissions.map(result => result.submittedAt.toISOString())).size, 1)
    assert.equal((await repo.get(id)).submitted, true)
    // Simulate a successful write whose response was lost: retry from a fresh connection.
    const retrySql = postgres(url!, { max: 1, connection: { search_path: schema } })
    try { assert.equal((await evaluationRepository(retrySql).submit(id, answers)).duplicate, true) } finally { await retrySql.end() }
    await assert.rejects(repo.submit(id, { ...answers, ranking: ['A', 'B', 'C'] }), { status: 409 })
    await assert.rejects(repo.submit(randomUUID(), answers), { status: 404 })
    const differentId = randomUUID()
    await repo.create(differentId, 'dataset', 'rubric', assignment, null)
    const race = await Promise.allSettled([repo.submit(differentId, answers), repo.submit(differentId, { ...answers, ranking: ['A', 'B', 'C'] })])
    assert.equal(race.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(race.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1)
    const constraintId = randomUUID()
    await repo.create(constraintId, 'dataset', 'rubric', assignment, null)
    for (const bad of [null, [], {}, { ...answers.ratings, A: { ...answers.ratings.A, coherence: 6 } }, { ...answers.ratings, A: { ...answers.ratings.A, coherence: null } }]) {
      await assert.rejects(sql`INSERT INTO evaluation_responses (session_id, ratings, ranking) VALUES (${constraintId}, ${sql.json(bad as never)}, ${sql.json(answers.ranking)})`)
    }
    await assert.rejects(sql`INSERT INTO evaluation_responses (session_id, ratings, ranking) VALUES (${constraintId}, ${sql.json(answers.ratings)}, '["A","A","B"]')`)
    const rows = await sql`SELECT r.*, s.assignment FROM evaluation_responses r JOIN evaluation_sessions s ON s.id = r.session_id`
    assert.equal(rows.length, 2)
    assert.equal(flattenResponse(rows.find(row => row.session_id === id))[`${assignment.samples.C.version}_rank`], 1)
  } finally {
    await sql.end()
    await admin`DROP SCHEMA ${admin(schema)} CASCADE`
    await admin.end()
  }
})
