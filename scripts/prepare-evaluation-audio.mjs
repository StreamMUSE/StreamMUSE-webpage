import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { splitMidi } from './evaluation-midi.mjs'

// Offline, reproducible rendering. Source MIDI files and previously published audio are never rewritten.
const [source, soundfont] = process.argv.slice(2)
if (!source || !soundfont) {
  console.error('Usage: node scripts/prepare-evaluation-audio.mjs <ISMIR_LBD_20260907> <MS Basic.sf3>')
  process.exit(1)
}
const root = process.cwd(), out = join(root, 'public/media/evaluation')
const scratch = join(tmpdir(), 'streammuse-evaluation-stems')
await Promise.all([out, scratch, join(root, 'src/data'), join(root, 'docs/evaluation/history')].map(dir => mkdir(dir, { recursive: true })))
const hash = value => createHash('sha256').update(value).digest('hex')
const synthesis = {
  soundfont: 'MuseScore MS Basic', soundfontSha256: hash(await readFile(soundfont)),
  sampleRate: 44100, gain: 0.3, reverb: false, chorus: false, polyphony: 512,
}
const render = {
  ...synthesis, melodyGain: 1, accompanimentGain: 10 ** (-12 / 20), accompanimentDb: -12, normalization: 'none',
  encoding: 'MP3 VBR quality 3, stereo', tailSeconds: 3,
  padding: 'Preserve the full MIDI timeline, then retain 3 seconds for piano release.',
}
const catalog = { datasetVersion: 'ismir-lbd-20260907-playback-v3', render, songs: [] }
const audit = { datasetVersion: catalog.datasetVersion, render, assets: [] }
let previous
try { previous = JSON.parse(await readFile(join(root, 'src/data/evaluation-catalog.json'), 'utf8')) } catch {}
if (previous && previous.datasetVersion !== catalog.datasetVersion) {
  for (const [input, suffix] of [['src/data/evaluation-catalog.json', 'catalog'], ['docs/evaluation/audio-audit.json', 'audit']]) {
    const target = join(root, 'docs/evaluation/history', `${previous.datasetVersion}-${suffix}.json`)
    try { await writeFile(target, await readFile(join(root, input)), { flag: 'wx' }) }
    catch (error) { if (error.code !== 'EEXIST') throw error }
  }
}
const historical = (await readdir(join(root, 'docs/evaluation/history'))).filter(name => name.endsWith('-catalog.json'))
const oldAssets = (await Promise.all(historical.map(async file => JSON.parse(await readFile(join(root, 'docs/evaluation/history', file), 'utf8')))))
  .flatMap(data => data.songs.flatMap(song => [song.reference, ...song.samples]))
function command(program, args) {
  const result = spawnSync(program, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`${program} failed: ${result.stderr || result.error || result.stdout}`)
  return result.stdout
}
function analyze(wav, duration) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', wav, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], { maxBuffer: 128 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`PCM analysis failed: ${wav}`)
  let peak = 0, sum = 0, discardedTailPeak = 0
  const count = Math.min(result.stdout.length / 4, Math.ceil(duration * render.sampleRate * 2))
  for (let i = 0; i < result.stdout.length; i += 4) {
    const value = result.stdout.readFloatLE(i)
    if (!Number.isFinite(value)) throw new Error('Non-finite PCM')
    peak = Math.max(peak, Math.abs(value))
    if (i / 4 < count) sum += value * value
    else discardedTailPeak = Math.max(discardedTailPeak, Math.abs(value))
  }
  return { peak, rms: Math.sqrt(sum / count), discardedTailPeak }
}
const folders = (await readdir(source)).filter(s => /^\d{2}_/.test(s) && !s.endsWith('_raw')).sort()
if (folders.length !== 10) throw new Error(`Expected 10 song folders, found ${folders.length}`)
const selectedSongs = process.env.EVALUATION_RENDER_SONGS?.split(',')
for (const folder of folders.filter(folder => !selectedSongs || selectedSongs.includes(folder.slice(0, 2)))) {
  const song = { id: folder.slice(0, 2), title: folder.slice(3), reference: null, samples: [] }
  const files = (await readdir(join(source, folder))).filter(s => s.endsWith('.mid')).sort()
  if (files.length !== 10) throw new Error(`Expected 10 MIDI files in ${folder}`)
  const prepared = await Promise.all(files.map(async filename => {
    const original = await readFile(join(source, folder, filename))
    return { filename, sourceSha256: hash(original), ...splitMidi(original) }
  }))
  // One pitch range and timeline across every seed/system of a song, including the reference.
  const pitches = prepared.flatMap(item => item.notes.map(note => note.pitch))
  const view = { duration: Math.max(...prepared.map(item => item.timelineEnd)) + render.tailSeconds,
    minPitch: Math.max(0, Math.min(...pitches) - 2), maxPitch: Math.min(127, Math.max(...pitches) + 2) }
  for (const { filename, sourceSha256, stems, midi, notes, timelineEnd } of prepared) {
    const version = filename.includes('legacy') ? 'v0' : filename.includes('single_n1') ? 'v1' : filename.includes('rule_constraints') ? 'v2' : 'reference'
    const seed = version === 'reference' ? null : Number(filename.match(/_s([012])_/)[1])
    for (const track of midi.tracks.filter(t => t.notes.length)) {
      if (track.instrument.number !== 0 || track.instrument.percussion) throw new Error(`Non-piano program: ${folder}/${filename}`)
    }
    const id = hash(`${catalog.datasetVersion}:${folder}/${filename}:${sourceSha256}:${JSON.stringify(render)}`).slice(0, 24)
    const renderDuration = timelineEnd + render.tailSeconds, mp3 = join(out, `${id}.mp3`), cached = join(scratch, `${id}.json`)
    let verification
    try {
      verification = JSON.parse(await readFile(cached, 'utf8'))
      if (hash(await readFile(mp3)) !== verification.audioSha256) throw new Error('Cached audio changed')
    } catch {
      const paths = {}, stemStats = {}
      for (const [role, bytes] of Object.entries(stems)) {
        const stemId = hash(Buffer.concat([bytes, Buffer.from(JSON.stringify(synthesis))])).slice(0, 24)
        const stemMidi = join(scratch, `${stemId}.mid`), wav = join(scratch, `${stemId}.wav`)
        await writeFile(stemMidi, bytes)
        try { await stat(wav) } catch {
          command('fluidsynth', ['-ni', '-F', wav, '-T', 'wav', '-O', 'float', '-r', String(synthesis.sampleRate), '-g', String(synthesis.gain), '-R', '0', '-C', '0', '-o', 'synth.polyphony=512', resolve(soundfont), stemMidi])
        }
        paths[role] = wav
        stemStats[role] = analyze(wav, renderDuration)
      }
      const mixed = join(scratch, `${id}.wav`)
      const filter = `[0:a]volume=${render.melodyGain}[mel];[1:a]volume=${render.accompanimentGain}[acc];[mel][acc]amix=inputs=2:normalize=0:duration=longest`
      command('ffmpeg', ['-y', '-v', 'error', '-i', paths.melody, '-i', paths.accompaniment, '-filter_complex', filter, '-c:a', 'pcm_f32le', mixed])
      const stats = analyze(mixed, renderDuration)
      if (stats.peak >= 0.98 || stats.peak === 0) throw new Error(`Invalid mix peak: ${id}`)
      if (stats.discardedTailPeak > 0.0005) throw new Error(`Audible tail beyond common release window: ${id}`)
      command('ffmpeg', ['-y', '-v', 'error', '-i', mixed, '-af', 'apad', '-t', String(renderDuration), '-codec:a', 'libmp3lame', '-q:a', '3', '-map_metadata', '-1', mp3])
      const duration = Number(command('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mp3]).trim())
      if (duration < renderDuration) throw new Error(`Truncated audio: ${id}`)
      verification = { ...stats, stems: stemStats, duration, midiDuration: midi.duration, timelineEnd, audioSha256: hash(await readFile(mp3)) }
      await writeFile(cached, JSON.stringify(verification))
    }
    const visualization = JSON.stringify({ schemaVersion: 1, ...view, notes }) + '\n'
    await writeFile(join(out, `${id}.json`), visualization)
    // Historical sessions retain their audio; only their note visualization is added.
    for (const old of oldAssets.filter(asset => asset.sourceSha256 === sourceSha256)) await writeFile(join(out, `${old.id}.json`), visualization)
    const asset = { id, src: `/media/evaluation/${id}.mp3`, visualizationSrc: `/media/evaluation/${id}.json`, duration: verification.duration, sourceSha256, sourceFile: `${folder}/${filename}` }
    if (version === 'reference') song.reference = asset
    else song.samples.push({ ...asset, version, seed })
    audit.assets.push({ ...asset, ...verification, visualizationSha256: hash(visualization), version, seed, notesByTrack: midi.tracks.map(t => ({ name: t.name, program: t.instrument.number, notes: t.notes.length })) })
    console.log(`${folder}/${filename} → ${id}; peak ${verification.peak.toFixed(3)}, melody RMS ${verification.stems.melody.rms.toFixed(4)}, acc RMS ${(verification.stems.accompaniment.rms * render.accompanimentGain).toFixed(4)}`)
  }
  for (const version of ['v0', 'v1', 'v2']) {
    if (song.samples.filter(s => s.version === version).map(s => s.seed).sort().join(',') !== '0,1,2') throw new Error(`Invalid ${version} seed set`)
  }
  if (!song.reference) throw new Error('Missing reference')
  catalog.songs.push(song)
}
// Optional workers only populate caches; the full run alone publishes the complete catalog.
if (!selectedSongs) {
  await writeFile(join(root, 'src/data/evaluation-catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
  await writeFile(join(root, 'docs/evaluation/audio-audit.json'), JSON.stringify(audit, null, 2) + '\n')
}
try {
  const license = (await readFile(join(dirname(soundfont), 'MS Basic_License.md'), 'utf8')).split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n'
  await writeFile(join(root, 'docs/evaluation/SOUNDFONT-LICENSE.md'), license)
} catch { console.warn('Include the soundfont license before publishing.') }
console.log(`Prepared ${audit.assets.length} verified mixes and note visualizations. Historical audio retained.`)
