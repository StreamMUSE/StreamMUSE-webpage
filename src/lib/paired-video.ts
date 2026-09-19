export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

/** The camera owns both the timeline and the only audible track. */
export class PairedVideoPlayback {
  private requested = false
  private suspended = false
  private starting = false
  private loaded = false
  private disposed = false
  private attempt = 0
  private frame = 0
  private targetTime = 0
  private state: PlaybackState = 'idle'
  private removeListeners: Array<() => void> = []

  constructor(
    private camera: HTMLVideoElement,
    private screen: HTMLVideoElement,
    private sources: { camera: string; screen: string },
    private duration: number,
    private onState: (state: PlaybackState) => void,
    private onTime: (time: number) => void,
    private onStart: () => void,
  ) {
    this.silenceScreen()
    for (const video of [camera, screen]) {
      this.listen(video, 'loadedmetadata', () => {
        video.currentTime = Math.min(this.targetTime, this.duration)
      })
      for (const event of ['canplay', 'seeked']) {
        this.listen(video, event, () => this.start())
      }
      this.listen(video, 'waiting', () => this.hold())
      this.listen(video, 'pause', () => {
        // Also handles another demo/MIDI player pausing this pair.
        if (this.requested && !this.suspended && video.paused) this.pause()
      })
      this.listen(video, 'ended', () => {
        if (!this.requested) return
        this.pause()
        this.onTime(this.duration)
        this.setState('ended')
      })
      this.listen(video, 'error', () => this.fail())
    }
    this.listen(screen, 'volumechange', () => this.silenceScreen())
    this.listen(camera, 'timeupdate', () => this.onTime(Math.min(camera.currentTime, this.duration)))
  }

  private listen(video: HTMLVideoElement, type: string, handler: () => void) {
    video.addEventListener(type, handler)
    this.removeListeners.push(() => video.removeEventListener(type, handler))
  }

  private silenceScreen() {
    if (!this.screen.muted) this.screen.muted = true
    if (this.screen.volume !== 0) this.screen.volume = 0
  }

  private setState(state: PlaybackState) {
    if (this.disposed || this.state === state) return
    this.state = state
    this.onState(state)
  }

  private ready() {
    return [this.camera, this.screen].every(video => video.readyState >= 3 && !video.seeking)
  }

  play() {
    if (this.disposed || this.requested) return
    if (this.state === 'ended' || this.camera.currentTime >= this.duration - .05) this.seek(0)
    this.onStart()
    this.requested = true
    this.suspended = true
    this.setState('loading')
    if (!this.loaded || this.camera.error || this.screen.error) {
      this.loaded = true
      this.camera.src = this.sources.camera
      this.screen.src = this.sources.screen
      this.camera.load()
      this.screen.load()
    }
    // Call play in the click handler, including on browsers requiring a user gesture.
    this.start(true)
    this.tick()
  }

  private start(allowUnready = false) {
    if (this.disposed || !this.requested || this.starting || (!allowUnready && !this.ready())) return
    if (!this.suspended && this.state === 'playing') return
    this.suspended = false
    this.starting = true
    this.silenceScreen()
    const attempt = ++this.attempt
    Promise.all([this.camera.play(), this.screen.play()]).then(() => {
      if (this.disposed || attempt !== this.attempt || !this.requested) return
      this.starting = false
      if (this.ready()) this.setState('playing')
      else this.hold()
    }).catch(() => {
      // A pause, seek, buffering event or unmount invalidates pending play promises.
      if (!this.disposed && attempt === this.attempt && this.requested) this.fail()
    })
  }

  private hold() {
    if (!this.requested || this.suspended) return
    this.suspended = true
    this.starting = false
    this.attempt++
    this.camera.pause()
    this.screen.pause()
    this.setState('loading')
  }

  pause() {
    this.requested = false
    this.suspended = false
    this.starting = false
    this.attempt++
    cancelAnimationFrame(this.frame)
    this.camera.pause()
    this.screen.pause()
    this.screen.playbackRate = 1
    if (this.state !== 'idle') this.setState('paused')
  }

  seek(time: number) {
    this.hold()
    this.targetTime = Math.max(0, Math.min(time, this.duration))
    for (const video of [this.camera, this.screen]) {
      if (video.readyState >= 1) video.currentTime = this.targetTime
    }
    this.onTime(this.targetTime)
    this.start()
  }

  private tick = () => {
    if (this.disposed || !this.requested) return
    if (!this.suspended && this.state === 'playing') {
      const difference = this.camera.currentTime - this.screen.currentTime
      if (Math.abs(difference) > .12) {
        this.seek(this.camera.currentTime)
      } else {
        // Small drift is corrected on the silent view without changing the music.
        this.screen.playbackRate = Math.abs(difference) > .025 ? 1 + Math.sign(difference) * .03 : 1
      }
    }
    this.frame = requestAnimationFrame(this.tick)
  }

  private fail() {
    if (this.disposed) return
    this.pause()
    this.setState('error')
  }

  dispose() {
    this.disposed = true
    this.removeListeners.forEach(remove => remove())
    this.pause()
    for (const video of [this.camera, this.screen]) {
      video.removeAttribute('src')
      video.load()
    }
  }
}
