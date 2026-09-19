import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import midiPackage from '@tonejs/midi'
const { Midi } = midiPackage
const songs = JSON.parse(readFileSync('src/data/v2-midi-examples.json', 'utf8'))
const systems = JSON.parse(readFileSync('src/data/midi-systems.json', 'utf8'))
const audit = JSON.parse(readFileSync('docs/v2-midi-examples-audit.json', 'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

test('ten melodies contain all three intended systems and seeds from the exact playback MIDI dataset', () => {
  assert.equal(songs.length, 10)
  assert.equal(audit.assets.length, 90)
  assert.equal(audit.source, 'ISMIR_LBD_202609010')
  assert.deepEqual(systems, [
    { id: 'v0', label: 'StreamMUSE', condition: 'legacy_m2a' },
    { id: 'v1', label: 'StreamMUSE+ (w/o PM)', condition: 'lekai_no_prompt' },
    { id: 'v2', label: 'StreamMUSE+', condition: 'pc_rule_if_else_n10' },
  ])
  assert.deepEqual(audit.systems, systems)
  assert.deepEqual(audit.mix, { melodyDb: 0, accompanimentDb: -12 })
  assert.deepEqual(songs.map(song => song.id), ['01','02','03','04','05','06','07','08','09','10'])
  const ids = new Set()
  for (const song of songs) {
    assert.ok(song.title)
    assert.equal(song.samples.length, 9)
    assert.equal(song.timelineDuration, Math.max(...song.samples.map(sample => sample.duration)))
    const bounds = new Set()
    for (const system of systems) {
      const samples = song.samples.filter(sample => sample.system === system.id)
      assert.deepEqual(samples.map(sample => sample.seed), [0, 1, 2])
      for (const sample of samples) {
        assert.ok(!ids.has(sample.id)); ids.add(sample.id)
        const record = audit.assets.find(row => row.song === song.id && row.system === system.id && row.seed === sample.seed)
        assert.equal(record.sourceFile, `${song.id}_${song.title}/${system.condition}_s${sample.seed}.mid`)
        assert.ok(!record.sourceFile.includes('_raw'))
        bounds.add(`${record.minPitch}-${record.maxPitch}`)
      }
    }
    assert.equal(bounds.size, 1, 'all nine piano rolls use identical pitch axes')
  }
})

test('published MIDI, stems, and piano rolls match the source audit; silent accompaniment remains intact', () => {
  const files = new Set()
  let empty = 0
  for (const song of songs) for (const sample of song.samples) {
    const record = audit.assets.find(row => row.song === song.id && row.system === sample.system && row.seed === sample.seed)
    for (const [field, hash] of [['midiSrc','midiSha256'], ['posterSrc','posterSha256']]) {
      const middle = sample.system === 'v2' ? '' : `${sample.system}/`
      assert.equal(sample[field], `/media/streammuse/v2/midi-examples/${song.id}/${middle}sample-${sample.seed+1}.${field === 'midiSrc' ? 'mid' : 'svg'}`)
      files.add(sample[field].split('/midi-examples/')[1])
      assert.equal(sha(readFileSync(`public${sample[field]}`)), record[hash])
    }
    for (const role of ['melody','accompaniment']) {
      const src = sample.stemSources[role], stem = record.stemAudio[role]
      assert.equal(src, `/media/streammuse/v2/midi-examples/audio/${stem.sha256.slice(0,24)}.mp3`)
      assert.equal(sha(readFileSync(`public${src}`)), stem.sha256)
      assert.equal(stem.duration, sample.duration)
      files.add(src.split('/midi-examples/')[1])
    }
    assert.ok((record.stemAudio.melody.peak + record.stemAudio.accompaniment.peak) * 10 ** (6/20) < .98, 'safe headroom at the maximum mix gain')
    const midi = new Midi(readFileSync(`public${sample.midiSrc}`))
    assert.ok(midi.duration <= sample.duration)
    assert.equal(midi.tracks.reduce((n,track) => n+track.notes.length, 0), record.noteCount)
    assert.equal(sample.accompanimentNotes, record.accompanimentNotes)
    if (!sample.accompanimentNotes) { empty++; assert.equal(sample.system,'v1'); assert.equal(record.stemAudio.accompaniment.peak, 0) }
    const poster = readFileSync(`public${sample.posterSrc}`, 'utf8')
    assert.match(poster, /viewBox="0 0 640 300"/)
    assert.ok(poster.includes('#357f78') && poster.includes('#c5824a'))
    assert.ok(!poster.includes('#faf9f5'), 'transparent backgrounds preserve the system tint')
    assert.ok(!/NaN|undefined|<script|https?:\/\/(?!www.w3.org)/.test(poster))
  }
  assert.equal(empty, 7, 'do not discard or replace original empty accompaniment outputs')
  const actual = readdirSync('public/media/streammuse/v2/midi-examples', { recursive: true }).filter(name => /\.(mid|mp3|svg)$/.test(name)).sort()
  assert.equal(files.size, 314)
  assert.deepEqual(actual, [...files].sort())
})
