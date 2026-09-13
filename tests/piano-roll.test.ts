import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parseMidi, writeMidi } from 'midi-file'
import catalog from '../src/data/evaluation-catalog.json'
import { splitMidi, trackRole } from '../scripts/evaluation-midi.mjs'
import { visibleWindow, seekTime, formatTime, type PianoRoll } from '../src/lib/evaluation/piano-roll'

const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex')

test('stem splitting preserves original tempo, channel events, sustain, overlapping pitches and velocities', () => {
  const original = Buffer.from(writeMidi({ header: { format: 1, numTracks: 3, ticksPerBeat: 480 }, tracks: [
    [{ deltaTime: 0, meta: true, type: 'setTempo', microsecondsPerBeat: 500000 }, { deltaTime: 480, meta: true, type: 'setTempo', microsecondsPerBeat: 1000000 }, { deltaTime: 960, meta: true, type: 'endOfTrack' }],
    [{ deltaTime: 0, meta: true, type: 'trackName', text: 'Guitar' }, { deltaTime: 0, type: 'programChange', channel: 0, programNumber: 0 }, { deltaTime: 0, type: 'noteOn', channel: 0, noteNumber: 60, velocity: 100 }, { deltaTime: 960, type: 'noteOff', channel: 0, noteNumber: 60, velocity: 32 }, { deltaTime: 480, meta: true, type: 'endOfTrack' }],
    [{ deltaTime: 0, meta: true, type: 'trackName', text: 'Piano' }, { deltaTime: 0, type: 'programChange', channel: 1, programNumber: 0 }, { deltaTime: 0, type: 'controller', channel: 1, controllerType: 64, value: 127 }, { deltaTime: 0, type: 'noteOn', channel: 1, noteNumber: 60, velocity: 50 }, { deltaTime: 480, type: 'noteOff', channel: 1, noteNumber: 60, velocity: 0 }, { deltaTime: 480, type: 'controller', channel: 1, controllerType: 64, value: 0 }, { deltaTime: 480, meta: true, type: 'endOfTrack' }],
  ] }))
  const before = hash(original), parsed = parseMidi(original)
  const split = splitMidi(original)
  assert.equal(hash(original), before)
  for (const [i, role] of Array.from(['melody', 'accompaniment'].entries())) {
    const stem = parseMidi(split.stems[role])
    assert.deepEqual(stem.tracks, [parsed.tracks[0], parsed.tracks[i + 1]])
  }
  assert.equal(split.timelineEnd, 2.5)
  assert.equal(split.notes.find(note => note.role === 'melody')?.duration, 1.5)
  assert.equal(split.notes.find(note => note.role === 'accompaniment')?.duration, .5)
  assert.throws(() => trackRole('Unknown'))
})

test('piano roll seek and follow window handle start, short songs, end, and out-of-bounds clicks', () => {
  assert.deepEqual(visibleWindow(0, 100), { start: 0, end: 12 })
  assert.deepEqual(visibleWindow(30, 100), { start: 27, end: 39 })
  assert.deepEqual(visibleWindow(100, 100), { start: 88, end: 100 })
  assert.deepEqual(visibleWindow(2, 5), { start: 0, end: 5 })
  assert.equal(seekTime(.5, 10, 22, 100), 16)
  assert.equal(seekTime(-2, 10, 22, 100), 10)
  assert.equal(seekTime(3, 88, 100, 98), 98)
  assert.equal(formatTime(61.9), '1:01')
})

test('all remixed assets have matching anonymous note data and a common per-song scale', () => {
  const audit = JSON.parse(readFileSync('docs/evaluation/audio-audit.json', 'utf8'))
  assert.equal(catalog.datasetVersion, 'ismir-lbd-202609010-playback-v1')
  assert.equal(audit.render.melodyGain, 1); assert.ok(Math.abs(20 * Math.log10(audit.render.accompanimentGain) + 12) < 1e-10)
  assert.equal(audit.render.accompanimentDb, -12)
  assert.equal(audit.render.normalization, 'none')
  for (const song of catalog.songs) {
    let scale: unknown
    for (const asset of [song.reference, ...song.samples]) {
      const bytes = readFileSync(`public${`/media/evaluation/${asset.id}.json`}`), roll = JSON.parse(bytes.toString()) as PianoRoll
      const entry = audit.assets.find((row: { id: string }) => row.id === asset.id)
      assert.equal(hash(bytes), entry.visualizationSha256)
      assert.deepEqual(Object.keys(roll).sort(), ['duration', 'maxPitch', 'minPitch', 'notes', 'schemaVersion'])
      const current = [roll.minPitch, roll.maxPitch, roll.duration]
      if (scale) assert.deepEqual(current, scale)
      scale = current
      assert.equal(roll.notes.length, entry.notesByTrack.reduce((n: number, t: { notes: number }) => n + t.notes, 0))
      for (const note of roll.notes) {
        assert.deepEqual(Object.keys(note).sort(), ['duration', 'pitch', 'role', 'time', 'velocity'])
        assert.ok(note.time >= 0 && note.duration > 0 && note.time + note.duration <= roll.duration)
        assert.ok(note.pitch >= roll.minPitch && note.pitch <= roll.maxPitch)
        assert.ok(['melody', 'accompaniment'].includes(note.role))
      }
    }
  }
})
