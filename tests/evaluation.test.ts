import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import catalogData from '../src/data/evaluation-catalog.json'
import { assignSamples, dimensions, labels, publicSession, validateAnswers, validateSessionId, versions, type Catalog } from '../src/lib/evaluation/model'
import { readBody } from '../src/lib/evaluation/http'
import { flattenResponse, responsesCsv } from '../scripts/evaluation-csv.mjs'

const catalog = catalogData as Catalog
const ratings = { A: { coherence: 1, plausibility: 2, musicality: 3 }, B: { coherence: 4, plausibility: 5, musicality: 1 }, C: { coherence: 2, plausibility: 3, musicality: 4 } }
const answers = { ratings, ranking: ['C', 'A', 'B'] }

test('catalog contains ten complete songs and 100 uniquely named, intact audio assets', () => {
  assert.equal(catalog.songs.length, 10)
  const audit = JSON.parse(readFileSync('docs/evaluation/audio-audit.json', 'utf8'))
  const ids = new Set()
  for (const song of catalog.songs) {
    assert.equal(song.samples.length, 9)
    for (const version of versions) assert.deepEqual(song.samples.filter(sample => sample.version === version).map(sample => sample.seed).sort(), [0, 1, 2])
    for (const asset of [song.reference, ...song.samples]) {
      assert.match(asset.id, /^[a-f0-9]{24}$/)
      assert.equal(asset.src, `/media/evaluation/${asset.id}.mp3`)
      assert.ok(!ids.has(asset.id)); ids.add(asset.id)
      assert.ok(statSync(`public${asset.src}`).size > 1000)
      const verification = audit.assets.find((item: { id: string }) => item.id === asset.id)
      assert.equal(createHash('sha256').update(readFileSync(`public${asset.src}`)).digest('hex'), verification.audioSha256)
      assert.ok(verification.peak > 0 && verification.peak < 0.98)
      assert.ok(asset.duration >= verification.midiDuration)
      assert.ok(asset.duration >= verification.timelineEnd + 3)
      assert.ok(asset.duration < verification.timelineEnd + 3.1)
      assert.ok(verification.discardedTailPeak <= 0.0005)
    }
  }
  assert.equal(ids.size, 100)
})

test('all 1,620 song/independent-seed/order combinations are reachable and stay within one song', () => {
  const outcomes = new Set()
  for (let song = 0; song < 10; song++) for (let v0 = 0; v0 < 3; v0++) for (let v1 = 0; v1 < 3; v1++) for (let v2 = 0; v2 < 3; v2++) for (let j2 = 0; j2 < 3; j2++) for (let j1 = 0; j1 < 2; j1++) {
    const choices = [song, v0, v1, v2, j2, j1]
    const assignment = assignSamples(catalog, max => { const value = choices.shift()!; assert.ok(value < max); return value })
    assert.equal(choices.length, 0)
    assert.equal(assignment.songId, catalog.songs[song].id)
    const selected = labels.map(label => assignment.samples[label])
    assert.deepEqual(selected.map(sample => sample.version).sort(), [...versions])
    selected.forEach(sample => assert.ok(catalog.songs[song].samples.some(candidate => candidate.id === sample.id)))
    outcomes.add(`${song}:${selected.map(sample => `${sample.version}-${sample.seed}`).join(',')}`)
  }
  assert.equal(outcomes.size, 1620)
})

test('public projection omits identities, source paths, seed and dataset metadata', () => {
  const assignment = assignSamples(catalog, () => 0)
  const result = publicSession({ id: randomUUID(), dataset_version: 'private', rubric_version: 'rubric', song_id: assignment.songId, assignment, created_at: new Date() }, false)
  assert.deepEqual(Object.keys(result).sort(), ['id', 'reference', 'rubricVersion', 'samples', 'submitted'])
  result.samples.forEach(sample => assert.deepEqual(Object.keys(sample).sort(), ['duration', 'id', 'label', 'src', 'stemSources', 'visualizationSrc']))
  assert.deepEqual(Object.keys(result.reference).sort(), ['duration', 'id', 'src', 'stemSources', 'visualizationSrc'])
})

test('ratings and rankings reject incomplete, non-integer, coercible, duplicated or extra fields', () => {
  assert.deepEqual(validateAnswers(answers), answers)
  for (const label of labels) for (const d of dimensions) for (const value of [0, 6, 2.5, '3', null, true, undefined]) {
    const invalid = structuredClone(answers); (invalid.ratings[label][d] as unknown) = value
    assert.throws(() => validateAnswers(invalid))
  }
  for (const ranking of [[], ['A'], ['A', 'A', 'B'], ['A', 'B', 'D'], ['A', 'B', 'C', 'A']]) assert.throws(() => validateAnswers({ ratings, ranking }))
  assert.throws(() => validateAnswers({ ...answers, version: 'v2' }))
  assert.throws(() => validateAnswers({ ...answers, ratings: { ...ratings, D: ratings.A } }))
  assert.throws(() => validateAnswers({ ...answers, ratings: { ...ratings, A: { ...ratings.A, other: 4 } } }))
  validateSessionId(randomUUID())
  assert.throws(() => validateSessionId("' OR true--"))
})

test('JSON requests reject wrong origin, invalid JSON, arrays and oversized streaming bodies', async () => {
  const make = (body: string, headers: Record<string, string> = {}) => new Request('https://study.example/api/evaluations', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body })
  assert.deepEqual(await readBody(make('{"ok":true}')), { ok: true })
  assert.deepEqual(await readBody(new Request('http://localhost:3008/api/evaluations', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', host: '127.0.0.1:3008', origin: 'http://127.0.0.1:3008' } })), {})
  assert.deepEqual(await readBody(new Request('http://internal/api/evaluations', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', host: 'study.example', 'x-forwarded-proto': 'https', origin: 'https://study.example' } })), {})
  await assert.rejects(readBody(make('{}', { origin: 'https://other.example' })), { status: 403 })
  await assert.rejects(readBody(make('{}', { 'content-type': 'text/plain' })), { status: 415 })
  await assert.rejects(readBody(make('invalid')), { status: 400 })
  await assert.rejects(readBody(make('[]')), { status: 400 })
  await assert.rejects(readBody(make('x'.repeat(4097))), { status: 413 })
})

test('CSV joins display labels to actual systems and independent ranking without averaging scores', () => {
  const assignment = assignSamples(catalog, () => 0)
  const row = { session_id: randomUUID(), assignment, ratings, ranking: answers.ranking, source_origin: 'https://study.example', song_id: '01', created_at: new Date(0), submitted_at: new Date(1000) }
  const flat = flattenResponse(row)
  for (const label of labels) {
    const sample = assignment.samples[label]
    assert.equal(flat[`${sample.version}_seed`], sample.seed)
    assert.equal(flat[`${sample.version}_label`], label)
    assert.equal(flat[`${sample.version}_rank`], answers.ranking.indexOf(label) + 1)
    for (const d of dimensions) assert.equal(flat[`${sample.version}_${d}`], ratings[label][d])
  }
  assert.equal(responsesCsv([row]).split('\r\n').length, 3)
  assert.ok(responsesCsv([{ ...row, source_origin: '=SUM(1,2)' }]).includes('"\'=SUM(1,2)"'))
})
