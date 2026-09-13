'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Play, RotateCcw } from 'lucide-react'
import songs from '@/data/v2-video-examples.json'
import { pauseOtherMedia } from '@/lib/media-playback'
import styles from './V2VideoGallery.module.css'

type Song = typeof songs[number]
type Recording = Song['takes'][number]
const durationLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`

function RecordingPlayer({ recording, title }: { recording: Recording; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const requests = useRef({ generation: 0 })
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const label = `${title}, Take ${recording.take}`

  useEffect(() => {
    const video = videoRef.current
    const pending = requests.current
    return () => {
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

function SongCard({ song }: { song: Song }) {
  const [selected, setSelected] = useState(0)
  const recording = song.takes[selected]
  return (
    <article className={styles.card} aria-labelledby={`video-song-${song.id}`}>
      <header className={styles.heading}>
        <span className={styles.number}>{song.id}</span>
        <h3 id={`video-song-${song.id}`}>{song.title}</h3>
        <span className={styles.duration}>{durationLabel(recording.duration)}</span>
      </header>
      <RecordingPlayer key={recording.id} recording={recording} title={song.title} />
      <footer className={styles.footer}>
        {song.takes.length > 1 ? (
          <div className={styles.takes} role="group" aria-label={`Recordings of ${song.title}`}>
            {song.takes.map((take, index) => (
              <button key={take.id} type="button" aria-pressed={index === selected}
                aria-label={`${song.title}, Take ${take.take}`} onClick={() => setSelected(index)}>Take {take.take}</button>
            ))}
          </div>
        ) : <span className={styles.singleTake}>Take 1</span>}
        <a className={styles.open} href={recording.src} target="_blank" rel="noreferrer" aria-label={`Open MP4: ${song.title}, Take ${recording.take}`}>
          MP4 <ExternalLink size={13} aria-hidden="true" />
        </a>
      </footer>
    </article>
  )
}

export default function V2VideoGallery() {
  return (
    <div>
      <div className={styles.intro}><p>10 melodies · 20 recordings</p><p>Select a take, then press play to watch.</p></div>
      <div className={styles.grid}>{songs.map(song => <SongCard key={song.id} song={song} />)}</div>
    </div>
  )
}
