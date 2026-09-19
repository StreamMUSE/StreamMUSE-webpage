'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Play, RotateCcw } from 'lucide-react'
import songs from '@/data/v2-video-examples.json'
import round2Songs from '@/data/v2-round2-videos.json'
import DualViewVideoPlayer from './DualViewVideoPlayer'
import { pauseOtherMedia } from '@/lib/media-playback'
import { getSongTitle } from '@/lib/song-titles'
import styles from './V2VideoGallery.module.css'

type Song = typeof songs[number] | typeof round2Songs[number]
type Recording = typeof songs[number]['takes'][number]
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

function SongCard({ song, round, number }: { song: Song; round: number; number: number }) {
  const [selected, setSelected] = useState(0)
  const recording = song.takes[selected]
  const title = getSongTitle(song.title)
  return (
    <article className={styles.card} aria-labelledby={`video-round-${round}-song-${song.id}`}>
      <header className={styles.heading}>
        <span className={styles.number}>{String(number).padStart(2, '0')}</span>
        <h3 id={`video-round-${round}-song-${song.id}`}>{title}</h3>
        <span className={styles.duration}>{durationLabel(recording.duration)}</span>
      </header>
      {'camera' in recording
        ? <DualViewVideoPlayer key={recording.id} recording={recording} title={title} />
        : <RecordingPlayer key={recording.id} recording={recording} title={title} />}
      <footer className={styles.footer}>
        {song.takes.length > 1 ? (
          <div className={styles.takes} role="group" aria-label={`Recordings of ${title}`}>
            {song.takes.map((take, index) => (
              <button key={take.id} type="button" aria-pressed={index === selected}
                aria-label={`${title}, Take ${take.take}`} onClick={() => setSelected(index)}>Take {take.take}</button>
            ))}
          </div>
        ) : <span className={styles.singleTake}>Take 1</span>}
        <a className={styles.open} href={'camera' in recording ? recording.camera.src : recording.src} target="_blank" rel="noreferrer" aria-label={`Open ${'camera' in recording ? 'camera ' : ''}MP4: ${title}, Take ${recording.take}`}>
          MP4 <ExternalLink size={13} aria-hidden="true" />
        </a>
      </footer>
    </article>
  )
}

export default function V2VideoGallery() {
  const [round, setRound] = useState(2)
  const selectedSongs = round === 2 ? round2Songs : songs
  return (
    <div>
      <div className={styles.rounds} role="group" aria-label="Recording rounds">
        <button type="button" aria-pressed={round === 2} onClick={() => setRound(2)}>Round 2 <span>Dual view</span></button>
        <button type="button" aria-pressed={round === 1} onClick={() => setRound(1)}>Round 1 <span>Screen recordings</span></button>
      </div>
      <div className={styles.intro}>
        <p>{selectedSongs.length} melodies · {selectedSongs.reduce((sum, song) => sum + song.takes.length, 0)} performances</p>
        <p>{round === 2 ? 'Select a take. Swap the camera and screen views while listening to the camera audio.' : 'Select a take, then press play to watch.'}</p>
      </div>
      <div className={styles.grid} key={round}>{selectedSongs.map((song, index) => <SongCard key={song.id} song={song} round={round} number={index + 1} />)}</div>
    </div>
  )
}
