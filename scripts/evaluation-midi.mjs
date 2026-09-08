import * as midiPackage from '@tonejs/midi'
import * as midiFile from 'midi-file'
const Midi = midiPackage.Midi ?? midiPackage.default.Midi
const { parseMidi, writeMidi } = midiFile

export function trackRole(name) {
  if (['Melody', 'Replay Melody', 'Guitar'].includes(name)) return 'melody'
  if (['Accompaniment', 'Unused Accompaniment', 'Piano'].includes(name)) return 'accompaniment'
  throw new Error(`Unknown MIDI track: ${name}`)
}

// Split at track boundaries without rewriting notes, velocities, controllers or tempo.
export function splitMidi(bytes) {
  const parsed = parseMidi(bytes)
  const conductor = [], tracks = {}
  for (const track of parsed.tracks) {
    if (!track.some(event => event.channel !== undefined)) { conductor.push(track); continue }
    const role = trackRole(track.find(event => event.type === 'trackName')?.text)
    if (tracks[role]) throw new Error(`Duplicate ${role} track`)
    tracks[role] = track
  }
  if (!tracks.melody || !tracks.accompaniment) throw new Error('Missing melody or accompaniment track')
  const stems = Object.fromEntries(Object.entries(tracks).map(([role, track]) => [role,
    Buffer.from(writeMidi({ header: { ...parsed.header, format: 1 }, tracks: [...conductor, track] })),
  ]))
  const midi = new Midi(bytes)
  const notes = midi.tracks.flatMap(track => track.notes.map(note => ({
    role: trackRole(track.name), pitch: note.midi, time: note.time,
    duration: note.duration, velocity: note.velocity,
  }))).sort((a, b) => a.time - b.time || a.pitch - b.pitch)
  const timelineEnd = Math.max(midi.duration, ...midi.tracks.map(track => midi.header.ticksToSeconds(track.endOfTrackTicks || 0)))
  return { stems, midi, notes, timelineEnd }
}
