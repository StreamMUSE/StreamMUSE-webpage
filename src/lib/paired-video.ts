export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

/** The camera owns both the timeline and the only audible track. */
export class PairedVideoPlayback {
  private requested = false
  private suspended = false
  private starting = false
  private screenStarting = false
  private lastScreenSeek = -Infinity
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
      for (const event of ['canplay', 'seeked', 'progress']) {
        this.listen(video, event, () => video === camera ? this.start() : this.followCamera())
      }
      this.listen(video, 'error', () => this.fail())
    }
    // A slow silent view must never interrupt the camera's music.
    this.listen(camera, 'waiting', () => this.hold())
    this.listen(camera, 'pause', () => {
      if (this.requested && !this.suspended && camera.paused) this.pause()
    })
    this.listen(camera, 'ended', () => {
      if (!this.requested) return
      this.pause()
      this.onTime(this.duration)
      this.setState('ended')
    })
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
    if (this.camera.readyState < 3 || this.camera.seeking) return false
    // After a real camera stall, build a small cushion before resuming.
    const buffered = this.camera.buffered
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= this.camera.currentTime && buffered.end(i) >= this.camera.currentTime) {
        return buffered.end(i) - this.camera.currentTime >= Math.min(1.5, this.duration - this.camera.currentTime - .05)
      }
    }
    return false
  }

  play() {
    if (this.disposed || this.requested) return
    if (this.state === 'ended' || this.camera.currentTime >= this.duration - .05) this.seek(0)
    this.onStart()
    this.requested = true
    this.suspended = true
    this.setState('loading')
    this.camera.preload = this.screen.preload = 'auto'
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
    this.startScreen(true)
    this.camera.play().then(() => {
      if (this.disposed || attempt !== this.attempt || !this.requested) return
      this.starting = false
      this.setState('playing')
      this.followCamera()
    }).catch(() => {
      // A pause, seek, buffering event or unmount invalidates pending play promises.
      if (!this.disposed && attempt === this.attempt && this.requested) this.fail()
    })
  }

  private startScreen(allowUnready = false) {
    if (!this.requested || this.suspended || this.screenStarting || !this.screen.paused ||
      (!allowUnready && (this.screen.readyState < 3 || this.screen.seeking))) return
    this.screenStarting = true
    const attempt = this.attempt
    this.screen.play().then(() => {
      if (attempt === this.attempt) this.screenStarting = false
    }).catch(error => {
      if (this.disposed || attempt !== this.attempt || !this.requested) return
      this.screenStarting = false
      if (!(error instanceof DOMException && error.name === 'AbortError')) this.fail()
    })
  }

  private followCamera() {
    if (this.disposed || !this.requested || this.suspended || this.state !== 'playing' ||
      this.camera.seeking || this.screen.seeking || this.screen.readyState < 3) return
    const difference = this.camera.currentTime - this.screen.currentTime
    if (Math.abs(difference) > .25 && performance.now() - this.lastScreenSeek >= 1000) {
      // Correct only the silent follower. Never seek/pause the audible master for drift.
      this.lastScreenSeek = performance.now()
      this.screen.currentTime = this.camera.currentTime
      this.screen.playbackRate = 1
      return
    }
    this.screen.playbackRate = Math.abs(difference) > .06 ? 1 + Math.sign(difference) * .05 : 1
    this.startScreen()
  }

  private hold() {
    if (!this.requested || this.suspended) return
    this.suspended = true
    this.starting = false
    this.screenStarting = false
    this.attempt++
    this.camera.pause()
    this.screen.pause()
    this.setState('loading')
  }

  pause() {
    this.requested = false
    this.suspended = false
    this.starting = false
    this.screenStarting = false
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
    this.lastScreenSeek = -Infinity
    for (const video of [this.camera, this.screen]) {
      if (video.readyState >= 1) video.currentTime = this.targetTime
    }
    this.onTime(this.targetTime)
    this.start()
  }

  private tick = () => {
    if (this.disposed || !this.requested) return
    this.followCamera()
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
