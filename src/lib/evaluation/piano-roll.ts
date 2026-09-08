export type RollNote = { role: 'melody' | 'accompaniment'; pitch: number; time: number; duration: number; velocity: number }
export type PianoRoll = { schemaVersion: 1; duration: number; minPitch: number; maxPitch: number; notes: RollNote[] }
export const windowSeconds = 12
export function visibleWindow(time: number, duration: number) {
  const span = Math.min(windowSeconds, duration)
  const start = Math.max(0, Math.min(time - 3, duration - span))
  return { start, end: start + span }
}
export function seekTime(fraction: number, start: number, end: number, duration: number) {
  return Math.max(0, Math.min(duration, start + Math.max(0, Math.min(1, fraction)) * (end - start)))
}
export function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
