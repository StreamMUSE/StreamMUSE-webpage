import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const base = process.env.EVALUATION_TEST_BASE_URL
test('running API: request validation, anonymous restore, concurrent submit and conflict status', { skip: !base }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base!).hostname), 'This automated write test is restricted to a local app and test database.')
  const post = (path: string, body: unknown, origin = base!) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) })
  const id = randomUUID()
  const created = await post('/api/evaluation-sessions', { sessionId: id })
  assert.equal(created.status, 200)
  const session = await created.json()
  assert.equal(session.id, id)
  assert.equal(session.samples.length, 3)
  assert.equal(session.submitted, false)
  assert.ok(!JSON.stringify(session).includes('sourceFile'))
  session.samples.forEach((sample: Record<string, unknown>) => {
    assert.deepEqual(Object.keys(sample).sort(), ['duration', 'id', 'label', 'src', 'stemSources', 'visualizationSrc'])
  })
  for (const asset of [session.reference, ...session.samples]) {
    const notes = await fetch(`${base}${asset.visualizationSrc}`)
    assert.equal(notes.status, 200)
    const roll = await notes.json()
    assert.equal(roll.schemaVersion, 1)
    assert.ok(roll.notes.length > 0)
    for (const url of [asset.src, asset.stemSources.melody, asset.stemSources.accompaniment]) assert.equal((await fetch(`${base}${url}`, { method: 'HEAD' })).status, 200)
  }
  assert.deepEqual(await (await post('/api/evaluation-sessions', { sessionId: id })).json(), session)
  const restored = await fetch(`${base}/api/evaluation-sessions/${id}`)
  assert.equal(restored.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await restored.json(), session)
  assert.equal((await fetch(`${base}/api/evaluation-sessions/not-a-uuid`)).status, 400)
  assert.equal((await fetch(`${base}/api/evaluation-sessions/${randomUUID()}`)).status, 404)
  assert.equal((await post('/api/evaluation-sessions', { sessionId: randomUUID() }, 'https://different.example')).status, 403)
  assert.equal((await post('/api/evaluation-sessions', { sessionId: randomUUID(), version: 'v2' })).status, 400)
  assert.equal((await post('/api/evaluations', { sessionId: id, ratings: {}, ranking: ['A', 'B', 'C'] })).status, 400)
  const answers = { sessionId: id, ratings: { A: { quality: 4 }, B: { quality: 2 }, C: { quality: 4 } } }
  assert.equal((await post('/api/evaluations', { ...answers, ranking: ['A', 'A', 'B'] })).status, 400)
  const results = await Promise.all(Array.from({ length: 8 }, () => post('/api/evaluations', answers)))
  results.forEach(result => assert.equal(result.status, 200))
  const receipts = await Promise.all(results.map(result => result.json()))
  assert.equal(receipts.filter(receipt => !receipt.duplicate).length, 1)
  assert.equal((await post('/api/evaluations', { ...answers, ratings: { ...answers.ratings, A: { quality: 3 } } })).status, 409)
  assert.equal((await (await fetch(`${base}/api/evaluation-sessions/${id}`)).json()).submitted, true)
})
