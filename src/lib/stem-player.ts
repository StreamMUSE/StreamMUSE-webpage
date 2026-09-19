/** A pair of stereo recordings scheduled on one Web Audio clock. */
export type StemRole = 'melody' | 'accompaniment'
export type StemSources = Record<StemRole, string>
export type Volume = { db: number; muted: boolean }
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'
export type PlayerState = { status: PlaybackStatus; duration: number; error?: string; volumes: Record<StemRole, Volume> }
export type PlaybackHandle = { pause(): void; release(): void }
export const defaultVolumes = { melody: { db: 0, muted: false }, accompaniment: { db: -12, muted: false } }
export const volumeGain = ({ db, muted }: Volume) => muted ? 0 : 10 ** (db / 20)
class PlaybackError extends Error {}
const roles: StemRole[] = ['melody', 'accompaniment']
let sharedContext: AudioContext | undefined
function audioContext() { return sharedContext ??= new AudioContext() }

export class StemPlayer implements PlaybackHandle {
  private context?: AudioContext
  private buffers?: AudioBuffer[]
  private nodes: AudioBufferSourceNode[] = []
  private gains: GainNode[] = []
  private controller?: AbortController
  private generation = 0
  private offset = 0
  private startedAt = 0
  private status: PlaybackStatus = 'idle'
  private error?: string
  private volumes = structuredClone(defaultVolumes)
  private disposed = false
  constructor(private urls: StemSources, private duration: number, private changed: (state: PlayerState) => void,
    private getContext: () => AudioContext = audioContext, private request: typeof fetch = (...args) => fetch(...args)) {}

  get currentTime() {
    return Math.min(this.duration, this.offset + (this.status === 'playing' ? Math.max(0, (this.context?.currentTime ?? 0) - this.startedAt) : 0))
  }
  get state(): PlayerState { return { status: this.status, duration: this.duration, error: this.error, volumes: structuredClone(this.volumes) } }
  private emit() { if (!this.disposed) this.changed(this.state) }
  private interrupted = () => { if (this.context?.state !== 'running' && this.status === 'playing') this.pause() }

  async play() {
    if (this.disposed || this.status === 'playing' || this.status === 'loading') return
    const generation = ++this.generation
    const controller = this.controller = new AbortController()
    this.error = undefined; this.status = 'loading'; this.emit()
    try {
      if (!this.context) {
        this.context = this.getContext()
        this.context.addEventListener('statechange', this.interrupted)
      }
      const context = this.context
      // Resume within the click gesture, before downloading/decoding (also on iOS).
      const resume = context.resume()
      const load = this.buffers ? Promise.resolve(this.buffers) : Promise.all(roles.map(async role => {
        const response = await this.request(this.urls[role], { signal: controller.signal })
        if (!response.ok) throw new PlaybackError('Check your connection and press Play to retry.')
        const bytes = await response.arrayBuffer()
        if (controller.signal.aborted) throw new Error('Cancelled')
        return context.decodeAudioData(bytes)
      }))
      const [buffers] = await Promise.all([load, resume])
      if (this.disposed || generation !== this.generation) return
      if (context.state !== 'running') throw new PlaybackError('Playback is paused by the browser. Press Play to retry.')
      if (Math.abs(buffers[0].duration - buffers[1].duration) > .002) throw new PlaybackError('The audio tracks could not be synchronized. Press Play to retry.')
      this.buffers = buffers
      this.duration = buffers[0].duration
      if (this.offset >= this.duration) this.offset = 0
      this.start()
    } catch (error) {
      if (generation !== this.generation || this.disposed) return
      controller.abort(); this.stopNodes(); this.buffers = undefined
      this.error = error instanceof PlaybackError ? error.message : 'Check your connection and press Play to retry.'
      this.status = 'error'; this.emit()
    }
  }

  private start() {
    const context = this.context!
    this.startedAt = context.currentTime + .025
    this.gains = roles.map(role => {
      const gain = context.createGain()
      gain.gain.value = volumeGain(this.volumes[role]); gain.connect(context.destination)
      return gain
    })
    this.nodes = this.buffers!.map((buffer, i) => {
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(this.gains[i])
      return source
    })
    this.nodes[0].onended = () => {
      this.offset = this.duration; this.stopNodes(); this.status = 'ended'; this.emit()
    }
    // Identical start time and seek offset prevent drift between the two stems.
    for (const source of this.nodes) source.start(this.startedAt, this.offset)
    this.status = 'playing'; this.emit()
  }
  private stopNodes() {
    for (const source of this.nodes) { source.onended = null; try { source.stop() } catch { /* Already stopped. */ } source.disconnect() }
    for (const gain of this.gains) gain.disconnect()
    this.nodes = []; this.gains = []
  }
  pause() {
    this.offset = this.currentTime
    ++this.generation; this.controller?.abort(); this.controller = undefined
    this.stopNodes()
    if (this.status !== 'idle' && this.status !== 'ended' && this.status !== 'error') this.status = 'paused'
    this.emit()
  }
  seek(seconds: number) {
    if (!Number.isFinite(seconds)) return
    const playing = this.status === 'playing'
    this.offset = Math.max(0, Math.min(seconds, this.duration)); this.stopNodes()
    if (this.offset >= this.duration) {
      ++this.generation; this.controller?.abort(); this.status = 'ended'; this.emit()
    } else if (playing) this.start()
    else { if (this.status === 'ended') this.status = 'paused'; this.emit() }
  }
  setVolume(role: StemRole, db: number, muted: boolean) {
    if (!Number.isFinite(db)) return
    this.volumes[role] = { db: Math.max(-40, Math.min(6, db)), muted }
    this.gains[roles.indexOf(role)]?.gain.setTargetAtTime(volumeGain(this.volumes[role]), this.context!.currentTime, .015)
    this.emit()
  }
  resetVolumes() { for (const role of roles) this.setVolume(role, defaultVolumes[role].db, false) }
  // Switching recordings releases decoded PCM; only the active player retains it.
  release() { this.pause(); this.buffers = undefined }
  dispose() { this.disposed = true; this.release(); this.context?.removeEventListener('statechange', this.interrupted) }
}
