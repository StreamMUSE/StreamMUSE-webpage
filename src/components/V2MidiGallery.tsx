'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Pause, Play, RotateCcw } from 'lucide-react'
import songs from '@/data/v2-midi-examples.json'
import styles from './V2MidiGallery.module.css'
import { pauseOtherMedia } from '@/lib/media-playback'

type Sample = typeof songs[number]['samples'][number]
type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'
type Playback = { id: string | null; status: PlaybackStatus; time: number }
const initial: Playback = { id: null, status: 'idle', time: 0 }
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`

export default function V2MidiGallery() {
  // One audio element for the entire grid: only the selected recording is fetched.
  const audioRef = useRef<HTMLAudioElement>(null)
  const stateRef = useRef<Playback>(initial)
  const requestRef = useRef({ generation: 0 })
  const [playback, setPlayback] = useState<Playback>(initial)
  const update = (next: Partial<Playback>) => {
    stateRef.current = { ...stateRef.current, ...next }
    setPlayback(stateRef.current)
  }

  useEffect(() => {
    const audio = audioRef.current
    const requests = requestRef.current
    return () => {
      requests.generation++
      audio?.pause()
      audio?.removeAttribute('src')
      audio?.load()
    }
  }, [])

  async function toggle(sample: Sample) {
    const audio = audioRef.current
    if (!audio) return
    const current = stateRef.current
    const request = ++requestRef.current.generation
    if (current.id === sample.id && (current.status === 'playing' || current.status === 'loading')) {
      audio.pause()
      if (current.status === 'loading') {
        audio.removeAttribute('src'); audio.load()
        update({ id: null, status: 'idle', time: 0 })
      } else update({ status: 'paused' })
      return
    }
    if (current.id !== sample.id || current.status === 'error' || audio.getAttribute('src') !== sample.audioSrc) {
      audio.pause()
      audio.src = sample.audioSrc
      audio.load()
      update({ id: sample.id, time: 0, status: 'loading' })
    } else {
      if (current.status === 'ended') { audio.currentTime = 0; update({ time: 0 }) }
      update({ status: 'loading' })
    }
    try {
      await audio.play()
      if (request === requestRef.current.generation) update({ status: 'playing' })
    } catch {
      if (request === requestRef.current.generation) update({ status: 'error' })
    }
  }

  function seek(seconds: number) {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, seconds))
    update({ time: audio.currentTime, status: audio.paused ? 'paused' : 'playing' })
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.intro}>
        <p>Ten melodies, three accompaniment samples each.</p>
        <div className={styles.legend}><span><i className={styles.melodyDot} />Melody</span><span><i className={styles.accompanimentDot} />Accompaniment</span></div>
      </div>
      <div className={styles.columns} aria-hidden="true"><span>MELODY</span>{[1, 2, 3].map(n => <span key={n}>Sample {n}</span>)}</div>
      <div className={styles.rows}>
        {songs.map(song => (
          <section className={styles.row} key={song.id} aria-labelledby={`midi-song-${song.id}`}>
            <header className={styles.song}><span className={styles.number}>{song.id}</span><h3 id={`midi-song-${song.id}`}>{song.title}</h3></header>
            {song.samples.map(sample => {
              const active = playback.id === sample.id
              const status = active ? playback.status : 'idle'
              const time = active ? playback.time : 0
              const label = `${song.title}, Sample ${sample.seed + 1}`
              const playing = status === 'playing', loading = status === 'loading'
              const action = loading ? 'Cancel loading' : playing ? 'Pause' : status === 'ended' ? 'Replay' : status === 'error' ? 'Retry' : 'Play'
              return (
                <article key={sample.id} className={`${styles.card} ${active ? styles.active : ''}`} aria-label={label}>
                  <div className={styles.cardHeader}><h4>Sample {sample.seed + 1}</h4><a className={styles.download} href={sample.midiSrc} download={`${song.id}-pc_rule_if_else_n10_s${sample.seed}.mid`} aria-label={`Download MIDI: ${label}`}><Download size={13} aria-hidden="true" />MIDI</a></div>
                  <button className={`${styles.visual} ${playing ? styles.visualPlaying : ''}`} type="button" onClick={() => void toggle(sample)} aria-label={`${action} ${label}`}>
                    {/* Static note images are prepared from the source MIDI and lazily loaded. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sample.posterSrc} alt="" width={640} height={300} loading="lazy" decoding="async" draggable={false} />
                    {active && time > 0 ? <span className={styles.playhead} style={{ left: `${Math.min(100, time / song.timelineDuration * 100)}%` }} aria-hidden="true" /> : null}
                    <span className={styles.playIcon}>{loading ? <Loader2 size={22} className={styles.spinner} aria-hidden="true" /> : playing ? <Pause size={22} aria-hidden="true" /> : <Play size={22} fill="currentColor" aria-hidden="true" />}</span>
                  </button>
                  <div className={styles.controls}>
                    <span className={styles.time}>{clock(time)} <span>/ {clock(sample.duration)}</span></span>
                    <button className={styles.reset} type="button" disabled={!active || loading || status === 'error'} onClick={() => seek(0)} aria-label={`Restart ${label}`}><RotateCcw size={13} aria-hidden="true" /></button>
                    <input type="range" className={styles.seek} aria-label={`Playback position: ${label}`} aria-valuetext={`${clock(time)} of ${clock(sample.duration)}`} min={0} max={sample.duration} step={0.1} value={Math.min(time, sample.duration)} disabled={!active || loading || status === 'error'} onChange={event => seek(Number(event.target.value))} />
                  </div>
                  {status === 'error' ? <p className={styles.error} role="alert">Audio could not load. Press Retry to try again.</p> : null}
                  <span className={styles.srOnly} role="status">{active ? `${label}: ${status}` : ''}</span>
                </article>
              )
            })}
          </section>
        ))}
      </div>
      <p className={styles.footnote}>Click a piano roll to listen. Use the slider to seek. Download the MIDI to explore the notes.</p>
      <audio ref={audioRef} preload="none" aria-hidden="true"
        onPlay={event => pauseOtherMedia(event.currentTarget)}
        onTimeUpdate={() => { const audio = audioRef.current; if (audio?.getAttribute('src')) update({ time: audio.currentTime }) }}
        onEnded={() => update({ status: 'ended' })}
        onPause={() => { if (audioRef.current?.paused && stateRef.current.status === 'playing') update({ status: 'paused' }) }}
        onError={() => { if (audioRef.current?.error && audioRef.current.getAttribute('src')) update({ status: 'error' }) }} />
    </div>
  )
}
