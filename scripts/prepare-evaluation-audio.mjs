import midiPackage from '@tonejs/midi'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
const { Midi } = midiPackage

// Offline, reproducible rendering. Source MIDI files are never rewritten.
const source = process.argv[2]
const soundfont = process.argv[3]
if (!source || !soundfont) {
  console.error('Usage: node scripts/prepare-evaluation-audio.mjs <ISMIR_LBD_20260907> <MS Basic.sf3>')
  process.exit(1)
}
const root = process.cwd()
const out = join(root, 'public/media/evaluation')
const scratch = join(tmpdir(), 'streammuse-evaluation-render')
await mkdir(out, { recursive: true })
await mkdir(scratch, { recursive: true })
await mkdir(join(root, 'src/data'), { recursive: true })
await mkdir(join(root, 'docs/evaluation'), { recursive: true })
const hash = (value) => createHash('sha256').update(value).digest('hex')
const soundfontSha256 = hash(await readFile(soundfont))
const synthesis = {
  soundfont: 'MuseScore MS Basic', soundfontSha256,
  sampleRate: 44100, gain: 0.3, reverb: false, chorus: false, polyphony: 512,
  encoding: 'MP3 VBR quality 3, stereo',
}
const render = { ...synthesis, tailSeconds: 3, padding: 'Preserve the full MIDI timeline, then retain 3 seconds for piano release.' }
const catalog = { datasetVersion: 'ismir-lbd-20260907-playback-v1', render, songs: [] }
const audit = { datasetVersion: catalog.datasetVersion, render, assets: [] }
function command(program, args) {
  const result = spawnSync(program, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`${program} failed: ${result.stderr || result.error || result.stdout}`)
  return result.stdout
}
const folders = (await readdir(source)).filter((s) => /^\d{2}_/.test(s) && !s.endsWith('_raw')).sort()
if (folders.length !== 10) throw new Error(`Expected 10 song folders, found ${folders.length}`)
for (const folder of folders) {
  const song = { id: folder.slice(0, 2), title: folder.slice(3), reference: null, samples: [] }
  const files = (await readdir(join(source, folder))).filter((s) => s.endsWith('.mid')).sort()
  if (files.length !== 10) throw new Error(`Expected 10 MIDI files in ${folder}`)
  for (const filename of files) {
    const original = await readFile(join(source, folder, filename))
    const sourceSha256 = hash(original)
    const midi = new Midi(original)
    const version = filename.includes('legacy') ? 'v0' : filename.includes('single_n1') ? 'v1' : filename.includes('rule_constraints') ? 'v2' : 'reference'
    const seed = version === 'reference' ? null : Number(filename.match(/_s([012])_/)[1])
    for (const track of midi.tracks.filter((t) => t.notes.length)) {
      if (track.instrument.number !== 0 || track.instrument.percussion) {
        throw new Error(`Unexpected non-piano program in ${folder}/${filename}; review before rendering.`)
      }
    }
    const id = hash(`${catalog.datasetVersion}:${folder}/${filename}:${sourceSha256}:${JSON.stringify(render)}`).slice(0, 24)
    const synthesisId = hash(`${catalog.datasetVersion}:${folder}/${filename}:${sourceSha256}:${JSON.stringify(synthesis)}`).slice(0, 24)
    const wav = join(scratch, `${synthesisId}.wav`)
    const timelineEnd = Math.max(midi.duration, ...midi.tracks.map(track => midi.header.ticksToSeconds(track.endOfTrackTicks || 0)))
    const renderDuration = timelineEnd + render.tailSeconds
    const mp3 = join(out, `${id}.mp3`)
    const cached = join(scratch, `${id}.json`)
    let verification
    try {
      verification = JSON.parse(await readFile(cached, 'utf8'))
      if (hash(await readFile(mp3)) !== verification.audioSha256) throw new Error('Cached audio changed')
    } catch {
      try { await stat(wav) } catch {
        command('fluidsynth', ['-ni', '-F', wav, '-T', 'wav', '-O', 'float', '-r', '44100', '-g', '0.3', '-R', '0', '-C', '0', '-o', 'synth.polyphony=512', resolve(soundfont), resolve(source, folder, filename)])
      }
      const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', wav, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], { maxBuffer: 128 * 1024 * 1024 })
      if (pcm.status !== 0) throw new Error(`PCM analysis failed for ${id}`)
      let peak = 0, sum = 0, discardedTailPeak = 0
      for (let i = 0; i < pcm.stdout.length; i += 4) {
        const value = pcm.stdout.readFloatLE(i)
        if (!Number.isFinite(value)) throw new Error(`Non-finite PCM in ${id}`)
        peak = Math.max(peak, Math.abs(value)); sum += value * value
        if (i / 4 / 2 / render.sampleRate >= renderDuration) discardedTailPeak = Math.max(discardedTailPeak, Math.abs(value))
      }
      if (peak >= 0.98) throw new Error(`Peak ${peak} risks clipping. Reduce the common gain and rerender ALL assets.`)
      if (peak === 0) throw new Error(`Entire combined audio is silent: ${id}`)
      if (discardedTailPeak > 0.0005) throw new Error(`Audible piano tail extends beyond the common release window in ${id}; increase tailSeconds for ALL assets.`)
      command('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-af', 'apad', '-t', String(renderDuration), '-codec:a', 'libmp3lame', '-q:a', '3', '-map_metadata', '-1', mp3])
      const duration = Number(command('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mp3]).trim())
      if (duration < midi.duration) throw new Error(`Audio truncates the source: ${id}`)
      verification = { peak, rms: Math.sqrt(sum / (pcm.stdout.length / 4)), duration, midiDuration: midi.duration, timelineEnd, discardedTailPeak, audioSha256: hash(await readFile(mp3)) }
      await writeFile(cached, JSON.stringify(verification))
    }
    const asset = { id, src: `/media/evaluation/${id}.mp3`, duration: verification.duration, sourceSha256, sourceFile: `${folder}/${filename}` }
    if (version === 'reference') song.reference = asset
    else song.samples.push({ ...asset, version, seed })
    audit.assets.push({ ...asset, ...verification, version, seed, notesByTrack: midi.tracks.map((t) => ({ name: t.name, program: t.instrument.number, notes: t.notes.length })) })
    console.log(`${folder}/${filename} → ${id}.mp3; peak ${verification.peak.toFixed(3)}`)
  }
  for (const version of ['v0', 'v1', 'v2']) {
    const seeds = song.samples.filter((s) => s.version === version).map((s) => s.seed).sort()
    if (seeds.join(',') !== '0,1,2') throw new Error(`Invalid ${version} seed set in ${folder}`)
  }
  if (!song.reference) throw new Error(`Missing reference in ${folder}`)
  catalog.songs.push(song)
}
await writeFile(join(root, 'src/data/evaluation-catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
await writeFile(join(root, 'docs/evaluation/audio-audit.json'), JSON.stringify(audit, null, 2) + '\n')
const license = join(dirname(soundfont), 'MS Basic_License.md')
try {
  const licenseText = (await readFile(license, 'utf8')).split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n'
  await writeFile(join(root, 'docs/evaluation/SOUNDFONT-LICENSE.md'), licenseText)
} catch { console.warn('Add the selected soundfont license to docs/evaluation before publishing.') }
console.log(`Prepared ${audit.assets.length} verified audio files.`)
