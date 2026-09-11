import test from 'node:test'
import assert from 'node:assert/strict'
import { basename } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import catalog from '../src/data/evaluation-catalog.json'
import { datasetVersion, sampleCondition } from '../scripts/evaluation-source.mjs'
import { evaluationStorageKeys } from '../src/lib/evaluation/storage'

test('September 10 playback files map to the requested systems and exclude old and raw results', () => {
  assert.equal(catalog.datasetVersion, datasetVersion)
  for (const song of catalog.songs) {
    assert.equal(basename(song.reference.sourceFile), '00_melody.mid')
    for (const sample of song.samples) {
      const prefixes = { v0: 'legacy_m2a', v1: 'lekai_no_prompt', v2: 'pc_rule_if_else_n10' }
      assert.equal(basename(sample.sourceFile), `${prefixes[sample.version as keyof typeof prefixes]}_s${sample.seed}.mid`)
      assert.deepEqual(sampleCondition(basename(sample.sourceFile)), { version: sample.version, seed: sample.seed })
      assert.ok(!sample.sourceFile.includes('_raw'))
    }
  }
  for (const file of ['legacy_m2a_s3.mid', 'lekai_no_prompt_s0_raw.mid', 'pc_rule_if_else_n10_s0_raw_with_prompt.mid', '01_rule_constraints_s0_full.mid', 'unknown.mid']) {
    assert.throws(() => sampleCondition(file), /Unexpected evaluation MIDI/)
  }
})

test('the published media directory contains exactly the current 100 recordings and their piano rolls', () => {
  const expected = catalog.songs.flatMap(song => [song.reference, ...song.samples])
    .flatMap(asset => [`${asset.id}.mp3`, `${asset.id}.json`]).sort()
  assert.equal(expected.length, 200)
  assert.deepEqual(readdirSync('public/media/evaluation').filter(name => !name.startsWith('.')).sort(), expected)
  assert.equal(existsSync('docs/evaluation/history'), false)
})

test('returning listeners start the refreshed study without consuming or overwriting old progress', () => {
  const storage = new Map([
    ['streammuse-evaluation-participant-v1', 'previous-participant'],
    ['streammuse-listening-evaluation-v1', 'previous-draft'],
  ])
  const current = evaluationStorageKeys(catalog.datasetVersion)
  assert.equal(storage.get(current.participantKey), undefined)
  assert.equal(storage.get(current.storageKey), undefined)
  storage.set(current.participantKey, 'current-participant')
  storage.set(current.storageKey, 'current-draft')
  const restored = evaluationStorageKeys(catalog.datasetVersion)
  assert.equal(storage.get(restored.participantKey), 'current-participant')
  assert.equal(storage.get(restored.storageKey), 'current-draft')
  assert.equal(storage.get('streammuse-evaluation-participant-v1'), 'previous-participant')
  assert.equal(storage.get('streammuse-listening-evaluation-v1'), 'previous-draft')
})
