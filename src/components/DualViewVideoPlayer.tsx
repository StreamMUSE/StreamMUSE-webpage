'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { MEDIA_PLAYBACK_EVENT, pauseOtherMedia } from '@/lib/media-playback'
import { PairedVideoPlayback, type PlaybackState } from '@/lib/paired-video'
import styles from './DualViewVideoPlayer.module.css'

type View = { src: string; poster: string; width: number; height: number }
export type DualViewRecording = { id: string; take: number; duration: number; camera: View; screen: View }
const timeLabel = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time) % 60).padStart(2, '0')}`

export default function DualViewVideoPlayer({ recording, title }: { recording: DualViewRecording; title: string }) {
  const camera = useRef<HTMLVideoElement>(null)
  const screen = useRef<HTMLVideoElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const playback = useRef<PairedVideoPlayback | null>(null)
  const [state, setState] = useState<PlaybackState>('idle')
  const [time, setTime] = useState(0)
  const [cameraMain, setCameraMain] = useState(true)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const label = `${title}, Take ${recording.take}`
  const active = state === 'playing' || state === 'loading'

  useEffect(() => {
    const cameraVideo = camera.current!, screenVideo = screen.current!
    const controller = new PairedVideoPlayback(cameraVideo, screenVideo,
      { camera: recording.camera.src, screen: recording.screen.src }, recording.duration,
      setState, setTime, () => pauseOtherMedia(cameraVideo, [screenVideo]))
    playback.current = controller
    const stopForOtherMedia = (event: Event) => {
      const activeMedia = (event as CustomEvent<HTMLMediaElement>).detail
      if (activeMedia !== cameraVideo && activeMedia !== screenVideo) controller.pause()
    }
    document.addEventListener(MEDIA_PLAYBACK_EVENT, stopForOtherMedia)
    setCanFullscreen(Boolean(document.fullscreenEnabled && container.current?.requestFullscreen))
    return () => {
      document.removeEventListener(MEDIA_PLAYBACK_EVENT, stopForOtherMedia)
      controller.dispose(); playback.current = null
    }
  }, [recording])

  function togglePlayback() {
    if (active) playback.current?.pause()
    else playback.current?.play()
  }

  function toggleMute() {
    const next = !(muted || volume === 0)
    if (camera.current) {
      camera.current.muted = next
      if (!next && volume === 0) { camera.current.volume = 1; setVolume(1) }
    }
    setMuted(next)
  }

  async function fullscreen() {
    try {
      setFullscreenError('')
      if (document.fullscreenElement === container.current) await document.exitFullscreen()
      else await container.current?.requestFullscreen()
    } catch { setFullscreenError('Fullscreen is unavailable in this browser.') }
  }

  return (
    <div ref={container} className={styles.player} aria-label={`${label}, dual-view player`}>
      <div className={styles.frame}>
        <video ref={camera} className={cameraMain ? styles.main : styles.inset} poster={recording.camera.poster}
          preload="none" playsInline aria-label={`${label}, camera view`} />
        <video ref={screen} className={cameraMain ? styles.inset : styles.main} poster={recording.screen.poster}
          preload="none" playsInline muted aria-label={`${label}, screen view`} />
        <span className={styles.mainLabel}>{cameraMain ? 'Camera' : 'Screen'}</span>
        <button type="button" className={styles.insetButton} onClick={() => setCameraMain(value => !value)}
          aria-label={`Make ${cameraMain ? 'screen' : 'camera'} the main view: ${label}`}>
          <span>{cameraMain ? 'Screen' : 'Camera'} <ArrowLeftRight size={12} aria-hidden="true" /></span>
        </button>
        {state === 'idle' || state === 'error' ? (
          <button type="button" className={styles.overlay} onClick={() => playback.current?.play()}
            aria-label={`${state === 'error' ? 'Retry' : 'Play'} video: ${label}`}>
            <span>{state === 'error' ? <RotateCcw size={25} /> : <Play size={25} fill="currentColor" />}</span>
          </button>
        ) : null}
        {state === 'loading' ? <span className={styles.loading} role="status">Loading both views…</span> : null}
      </div>
      <div className={styles.controls}>
        <div className={styles.transport}>
          <button type="button" onClick={togglePlayback} aria-label={`${active ? 'Pause' : 'Play'} ${label}`}>
            {active ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <input type="range" min={0} max={recording.duration} step={.1} value={time}
            disabled={state === 'idle' || state === 'error'} aria-label={`Seek ${label}`} aria-valuetext={`${timeLabel(time)} of ${timeLabel(recording.duration)}`}
            onChange={event => playback.current?.seek(Number(event.target.value))} />
          <span className={styles.time}>{timeLabel(time)} / {timeLabel(recording.duration)}</span>
        </div>
        <div className={styles.options}>
          <div className={styles.sound}>
            <button type="button" onClick={toggleMute} aria-label={`${muted || volume === 0 ? 'Unmute' : 'Mute'} camera audio: ${label}`}>
              {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <input type="range" min={0} max={1} step={.05} value={muted ? 0 : volume} aria-label={`Camera volume: ${label}`}
              onChange={event => {
                const next = Number(event.target.value)
                if (camera.current) { camera.current.volume = next; camera.current.muted = false }
                setVolume(next); setMuted(false)
              }} />
            <span>Camera audio</span>
          </div>
          <button type="button" className={styles.swap} onClick={() => setCameraMain(value => !value)} aria-label={`Swap views: ${label}`}>
            <ArrowLeftRight size={15} aria-hidden="true" /> Swap views
          </button>
          {canFullscreen ? <button type="button" onClick={() => void fullscreen()} aria-label={`Fullscreen: ${label}`}><Maximize size={17} /></button> : null}
        </div>
      </div>
      {state === 'error' ? <p className={styles.error} role="alert">A video could not load. Retry or <a href={recording.camera.src} target="_blank" rel="noreferrer">open the camera video</a>.</p> : null}
      {fullscreenError ? <p className={styles.error} role="status">{fullscreenError}</p> : null}
    </div>
  )
}
