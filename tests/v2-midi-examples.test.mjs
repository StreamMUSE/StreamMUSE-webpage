import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import midiPackage from '@tonejs/midi'
const { Midi } = midiPackage

const songs = JSON.parse(readFileSync('src/data/v2-midi-examples.json', 'utf8'))
const audit = JSON.parse(readFileSync('docs/v2-midi-examples-audit.json', 'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

test('v2 gallery contains exactly ten complete three-seed rows, mapped to the intended playback MIDI', () => {
  assert.equal(songs.length, 10)
  assert.equal(audit.assets.length, 30)
  assert.equal(audit.source, 'ISMIR_LBD_202609010')
  assert.equal(audit.condition, 'pc_rule_if_else_n10')
  assert.deepEqual(audit.mix, { melodyDb: 0, accompanimentDb: -12 })
  assert.deepEqual(songs.map(song => song.id), ['01','02','03','04','05','06','07','08','09','10'])
  for (const song of songs) {
    assert.ok(song.title)
    assert.deepEqual(song.samples.map(sample => sample.seed), [0, 1, 2])
    assert.equal(song.timelineDuration, Math.max(...song.samples.map(sample => sample.duration)))
    for (const sample of song.samples) {
      const record = audit.assets.find(row => row.song === song.id && row.seed === sample.seed)
      assert.equal(record.sourceFile, `${song.id}_${song.title}/pc_rule_if_else_n10_s${sample.seed}.mid`)
      assert.ok(!record.sourceFile.includes('_raw'))
    }
  }
})

test('all 90 published assets match their source audit; MIDI notes fit each audio timeline', () => {
  const files = []
  for (const song of songs) for (const sample of song.samples) {
    const record = audit.assets.find(row => row.song === song.id && row.seed === sample.seed)
    for (const [field, hash] of [['midiSrc','midiSha256'], ['audioSrc','audioSha256'], ['posterSrc','posterSha256']]) {
      assert.match(sample[field], new RegExp(`^/media/streammuse/v2/midi-examples/${song.id}/sample-${sample.seed+1}\\.(mid|mp3|svg)$`))
      files.push(sample[field].split('/midi-examples/')[1])
      assert.equal(sha(readFileSync(`public${sample[field]}`)), record[hash])
    }
    const midi = new Midi(readFileSync(`public${sample.midiSrc}`))
    assert.ok(midi.tracks.filter(track => track.notes.length).length >= 2)
    assert.ok(midi.duration <= sample.duration)
    const poster = readFileSync(`public${sample.posterSrc}`, 'utf8')
    assert.match(poster, /viewBox="0 0 640 300"/)
    assert.ok(poster.includes('#357f78') && poster.includes('#c5824a'))
    assert.ok(!/NaN|undefined|<script|https?:\/\/(?!www.w3.org)/.test(poster))
  }
  const actual = readdirSync('public/media/streammuse/v2/midi-examples', { recursive: true }).filter(name => /\.(mid|mp3|svg)$/.test(name)).sort()
  assert.equal(files.length, 90)
  assert.deepEqual(actual, files.sort())
})
