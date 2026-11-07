'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { MEDIA_PLAYBACK_EVENT, pauseOtherMedia } from '@/lib/media-playback'
import styles from './V2VideoGallery.module.css'

type Recording = { id: string; take: number; src: string; poster: string; width: number; height: number }

export default function SingleViewVideoPlayer({ recording, title }: { recording: Recording; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const requests = useRef({ generation: 0 })
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const label = `${title}, Take ${recording.take}`

  useEffect(() => {
    const video = videoRef.current
    const pending = requests.current
    const stopForOtherMedia = (event: Event) => {
      if ((event as CustomEvent).detail !== video) {
        pending.generation++
        video?.pause()
        setStatus(current => current === 'loading' ? 'ready' : current)
      }
    }
    document.addEventListener(MEDIA_PLAYBACK_EVENT, stopForOtherMedia)
    return () => {
      document.removeEventListener(MEDIA_PLAYBACK_EVENT, stopForOtherMedia)
      pending.generation++
      video?.pause()
      video?.removeAttribute('src')
      video?.load()
    }
  }, [])

  async function play() {
    const video = videoRef.current
    if (!video) return
    const request = ++requests.current.generation
    setStatus('loading')
    pauseOtherMedia(video)
    video.src = recording.src
    video.load()
    try {
      await video.play()
      if (request === requests.current.generation) setStatus('ready')
    } catch (error) {
      if (request === requests.current.generation) {
        setStatus(error instanceof DOMException && error.name === 'AbortError' ? 'ready' : 'error')
      }
    }
  }

  return (
    <div id={`${recording.id}-player`} className={styles.player}>
      <div className={styles.frame} style={{ aspectRatio: `${recording.width} / ${recording.height}` }}>
        <video ref={videoRef} poster={recording.poster} preload="none" playsInline
          controls={status === 'loading' || status === 'ready'} aria-label={label}
          onPlay={event => pauseOtherMedia(event.currentTarget)}
          onPlaying={() => setStatus('ready')}
          onError={() => setStatus('error')} />
        {status === 'idle' || status === 'error' ? (
          <button type="button" className={styles.play} onClick={() => void play()} aria-label={`${status === 'error' ? 'Retry' : 'Play'} video: ${label}`}>
            <span>{status === 'error' ? <RotateCcw size={25} aria-hidden="true" /> : <Play size={25} fill="currentColor" aria-hidden="true" />}</span>
          </button>
        ) : null}
      </div>
      {status === 'error' ? <p className={styles.error} role="alert">Video could not load. Try again or <a href={recording.src} target="_blank" rel="noreferrer">open the MP4</a>.</p> : null}
      <span className={styles.srOnly} role="status">{status === 'loading' ? `Loading ${label}` : ''}</span>
    </div>
  )
}
