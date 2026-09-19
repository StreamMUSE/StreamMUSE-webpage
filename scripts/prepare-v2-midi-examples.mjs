import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises'
import path from 'node:path'

// Offline preparation. The public gallery has no evaluation-route or database dependency.
const [sourceRoot, evaluationRoot] = process.argv.slice(2)
if (!sourceRoot || !evaluationRoot) throw new Error('Usage: node scripts/prepare-v2-midi-examples.mjs MIDI_SOURCE_FOLDER EVALUATION_CHECKOUT')
const catalog = JSON.parse(await readFile(path.join(evaluationRoot, 'src/data/evaluation-catalog.json'), 'utf8'))
const evaluationAudit = JSON.parse(await readFile(path.join(evaluationRoot, 'docs/evaluation/audio-audit.json'), 'utf8'))
assert.equal(catalog.datasetVersion, 'ismir-lbd-202609010-playback-v1')
assert.equal(catalog.songs.length, 10)
const systems = [
  { id: 'v0', label: 'StreamMUSE', condition: 'legacy_m2a' },
  { id: 'v1', label: 'StreamMUSE+ (w/o PM)', condition: 'lekai_no_prompt' },
  { id: 'v2', label: 'StreamMUSE+', condition: 'pc_rule_if_else_n10' },
]
const sha256 = data => createHash('sha256').update(data).digest('hex')
const songs = [], audit = [], outputs = new Map()
const W = 640, H = 300, assetRoot = 'public/media/streammuse/v2/midi-examples'
for (const song of catalog.songs) {
  const selected = systems.flatMap(system => {
    const samples = song.samples.filter(sample => sample.version === system.id).sort((a, b) => a.seed - b.seed)
    assert.deepEqual(samples.map(sample => sample.seed), [0, 1, 2])
    return samples
  })
  const title = path.dirname(selected[0].sourceFile).replace(/^\d+_/, '')
  const samples = [], timelineDuration = Math.max(...selected.map(sample => sample.duration))
  const rolls = await Promise.all(selected.map(async sample => JSON.parse(await readFile(path.join(evaluationRoot, 'public', sample.visualizationSrc), 'utf8'))))
  // All nine samples of a song use the same axes, including silent accompaniment outputs.
  const pitches = rolls.flatMap(roll => roll.notes.map(note => note.pitch))
  const minPitch = Math.max(0, Math.min(...pitches) - 2), maxPitch = Math.min(127, Math.max(...pitches) + 2)
  for (const [index, sample] of selected.entries()) {
    const system = systems.find(system => system.id === sample.version)
    assert.equal(sample.sourceFile, `${song.id}_${title}/${system.condition}_s${sample.seed}.mid`)
    const midi = await readFile(path.join(sourceRoot, sample.sourceFile))
    assert.equal(sha256(midi), sample.sourceSha256, 'MIDI must match the evaluation source exactly')
    const record = evaluationAudit.assets.find(asset => asset.id === sample.id)
    const rollBytes = await readFile(path.join(evaluationRoot, 'public', sample.visualizationSrc))
    assert.equal(sha256(rollBytes), record.visualizationSha256)
    const roll = rolls[index]
    assert.equal(roll.schemaVersion, 1)
    assert.ok(roll.notes.some(note => note.role === 'melody'))
    assert.ok(roll.notes.every(note => note.time >= 0 && note.time + note.duration <= sample.duration))
    const stemSources = {}, stemAudio = {}
    for (const role of ['melody', 'accompaniment']) {
      const bytes = await readFile(path.join(evaluationRoot, 'public', sample.stemSources[role]))
      const hash = sha256(bytes)
      assert.equal(hash, record.stemAudio[role].sha256)
      assert.equal(record.stemAudio[role].duration, sample.duration)
      const src = `/media/streammuse/v2/midi-examples/audio/${hash.slice(0, 24)}.mp3`
      if (outputs.has(`public${src}`)) assert.equal(sha256(outputs.get(`public${src}`)), hash)
      outputs.set(`public${src}`, bytes)
      stemSources[role] = src
      stemAudio[role] = { sha256: hash, duration: sample.duration, peak: record.stems[role].peak }
    }
    // Keep the existing StreamMUSE+ MIDI download URLs stable.
    const base = `/media/streammuse/v2/midi-examples/${song.id}/${system.id === 'v2' ? '' : `${system.id}/`}sample-${sample.seed + 1}`
    outputs.set(`public${base}.mid`, midi)
    const x = t => (t / timelineDuration * W).toFixed(2), pitchHeight = (H - 12) / (maxPitch - minPitch + 1)
    const y = pitch => (6 + (maxPitch - pitch) * pitchHeight).toFixed(2)
    // Transparent piano-roll backgrounds let each card's system tint remain visible.
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Melody and accompaniment piano roll">`
    for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
      if ([1, 3, 6, 8, 10].includes(pitch % 12)) svg += `<rect x="0" y="${y(pitch)}" width="${W}" height="${pitchHeight.toFixed(2)}" fill="#273447" opacity=".025"/>`
      if (pitch % 12 === 0) svg += `<path d="M0 ${y(pitch)}H${W}" stroke="#273447" opacity=".08" stroke-width=".8"/>`
    }
    for (let second = 0; second < timelineDuration; second += 2) svg += `<path d="M${x(second)} 0V${H}" stroke="#273447" opacity="${second % 8 === 0 ? '.13' : '.05'}" stroke-width=".8"/>`
    for (const role of ['accompaniment', 'melody']) {
      const d = roll.notes.filter(note => note.role === role).map(note => `M${x(note.time)} ${y(note.pitch)}h${Math.max(1.8, note.duration / timelineDuration * W).toFixed(2)}v${Math.max(2.5, pitchHeight * .8).toFixed(2)}H${x(note.time)}Z`).join('')
      svg += `<path d="${d}" fill="${role === 'melody' ? '#357f78' : '#c5824a'}"/>`
    }
    svg += '</svg>\n'
    outputs.set(`public${base}.svg`, svg)
    const accompanimentNotes = roll.notes.filter(note => note.role === 'accompaniment').length
    samples.push({ id: `${system.id}-${song.id}-s${sample.seed}`, system: system.id, seed: sample.seed, midiSrc: `${base}.mid`, stemSources, posterSrc: `${base}.svg`, duration: sample.duration, accompanimentNotes })
    audit.push({ song: song.id, system: system.id, seed: sample.seed, sourceFile: sample.sourceFile, midiSha256: sha256(midi), stemAudio, posterSha256: sha256(svg), noteCount: roll.notes.length, accompanimentNotes, minPitch, maxPitch, duration: sample.duration })
  }
  songs.push({ id: song.id, title, timelineDuration, samples })
}
// Validate everything before replacing the generated files; sources are read-only.
for (const [file, bytes] of outputs) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, bytes) }
for (const file of await readdir(assetRoot, { recursive: true })) {
  const full = path.join(assetRoot, file)
  if (/\.(mp3|mid|svg)$/.test(file) && !outputs.has(full)) await unlink(full)
}
await writeFile('src/data/v2-midi-examples.json', JSON.stringify(songs, null, 2) + '\n')
await writeFile('src/data/midi-systems.json', JSON.stringify(systems, null, 2) + '\n')
await writeFile('docs/v2-midi-examples-audit.json', JSON.stringify({ source: 'ISMIR_LBD_202609010', systems, mix: { melodyDb: 0, accompanimentDb: -12 }, assets: audit }, null, 2) + '\n')
console.log(`Prepared ${songs.length} songs, ${audit.length} samples, ${outputs.size} assets; ${audit.filter(sample => !sample.accompanimentNotes).length} original empty-accompaniment outputs preserved.`)
