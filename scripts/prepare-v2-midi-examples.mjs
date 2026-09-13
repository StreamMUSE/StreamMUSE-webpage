import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'

// Offline preparation only. The deployed gallery has no evaluation or database dependency.
const [sourceRoot, evaluationRoot] = process.argv.slice(2)
if (!sourceRoot || !evaluationRoot) throw new Error('Usage: node scripts/prepare-v2-midi-examples.mjs MIDI_SOURCE_FOLDER EVALUATION_CHECKOUT')
const catalog = JSON.parse(await readFile(path.join(evaluationRoot, 'src/data/evaluation-catalog.json'), 'utf8'))
assert.equal(catalog.datasetVersion, 'ismir-lbd-202609010-playback-v1')
assert.equal(catalog.songs.length, 10)
const sha256 = data => createHash('sha256').update(data).digest('hex')
const songs = [], audit = []
const W = 640, H = 300
for (const song of catalog.songs) {
  const selected = song.samples.filter(sample => sample.version === 'v2').sort((a, b) => a.seed - b.seed)
  assert.deepEqual(selected.map(sample => sample.seed), [0, 1, 2])
  const title = path.dirname(selected[0].sourceFile).replace(/^\d+_/, '')
  const samples = []
  const timelineDuration = Math.max(...selected.map(sample => sample.duration))
  const rolls = await Promise.all(selected.map(async sample => JSON.parse(await readFile(path.join(evaluationRoot, 'public', sample.visualizationSrc), 'utf8'))))
  // Use identical axes for the three versions of a melody, without empty octaves
  // belonging to other evaluation systems that are absent from this gallery.
  const pitches = rolls.flatMap(roll => roll.notes.map(note => note.pitch))
  const minPitch = Math.max(0, Math.min(...pitches) - 2)
  const maxPitch = Math.min(127, Math.max(...pitches) + 2)
  for (const [index, sample] of selected.entries()) {
    assert.equal(path.basename(sample.sourceFile), `pc_rule_if_else_n10_s${sample.seed}.mid`)
    const midi = await readFile(path.join(sourceRoot, sample.sourceFile))
    assert.equal(sha256(midi), sample.sourceSha256, 'MIDI must match the evaluation source exactly')
    const audioPath = path.join(evaluationRoot, 'public', sample.src)
    const audio = await readFile(audioPath)
    const roll = rolls[index]
    assert.equal(roll.schemaVersion, 1)
    assert.ok(roll.notes.some(note => note.role === 'melody') && roll.notes.some(note => note.role === 'accompaniment'))
    assert.ok(roll.notes.every(note => note.time >= 0 && note.time + note.duration <= sample.duration))
    const base = `/media/streammuse/v2/midi-examples/${song.id}/sample-${sample.seed + 1}`
    await mkdir(path.dirname(`public${base}`), { recursive: true })
    await writeFile(`public${base}.mid`, midi)
    await copyFile(audioPath, `public${base}.mp3`)
    const x = t => (t / timelineDuration * W).toFixed(2)
    const pitchHeight = (H - 12) / (maxPitch - minPitch + 1)
    const y = pitch => (6 + (maxPitch - pitch) * pitchHeight).toFixed(2)
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Melody and accompaniment piano roll"><rect width="${W}" height="${H}" fill="#faf9f5"/>`
    for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
      if ([1, 3, 6, 8, 10].includes(pitch % 12)) svg += `<rect x="0" y="${y(pitch)}" width="${W}" height="${pitchHeight.toFixed(2)}" fill="#f0efea"/>`
      if (pitch % 12 === 0) svg += `<path d="M0 ${y(pitch)}H${W}" stroke="#e0e4de" stroke-width=".8"/>`
    }
    for (let second = 0; second < timelineDuration; second += 2) svg += `<path d="M${x(second)} 0V${H}" stroke="${second % 8 === 0 ? '#dce1d8' : '#ecece5'}" stroke-width=".8"/>`
    for (const role of ['accompaniment', 'melody']) {
      const notes = roll.notes.filter(note => note.role === role)
      const d = notes.map(note => `M${x(note.time)} ${y(note.pitch)}h${Math.max(1.8, note.duration / timelineDuration * W).toFixed(2)}v${Math.max(2.5, pitchHeight * .8).toFixed(2)}H${x(note.time)}Z`).join('')
      svg += `<path d="${d}" fill="${role === 'melody' ? '#357f78' : '#c5824a'}"/>`
    }
    svg += '</svg>\n'
    await writeFile(`public${base}.svg`, svg)
    samples.push({ id: `v2-${song.id}-s${sample.seed}`, seed: sample.seed, midiSrc: `${base}.mid`, audioSrc: `${base}.mp3`, posterSrc: `${base}.svg`, duration: sample.duration })
    audit.push({ song: song.id, seed: sample.seed, sourceFile: sample.sourceFile, midiSha256: sha256(midi), audioSha256: sha256(audio), posterSha256: sha256(svg), noteCount: roll.notes.length, minPitch, maxPitch, duration: sample.duration })
  }
  songs.push({ id: song.id, title, timelineDuration, samples })
}
await writeFile('src/data/v2-midi-examples.json', JSON.stringify(songs, null, 2) + '\n')
await writeFile('docs/v2-midi-examples-audit.json', JSON.stringify({ source: 'ISMIR_LBD_202609010', condition: 'pc_rule_if_else_n10', mix: { melodyDb: 0, accompanimentDb: -12 }, assets: audit }, null, 2) + '\n')
console.log(`Prepared ${songs.length} songs and ${audit.length} exact evaluation samples: MIDI, MP3 and piano-roll SVG.`)
