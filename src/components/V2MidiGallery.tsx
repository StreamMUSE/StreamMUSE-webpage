'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import songs from '@/data/v2-midi-examples.json'
import systems from '@/data/midi-systems.json'
import { MEDIA_PLAYBACK_EVENT, pauseOtherMedia } from '@/lib/media-playback'
import { getSongTitle } from '@/lib/song-titles'
import { StemPlayer, defaultVolumes, type PlaybackStatus, type StemRole, type Volume } from '@/lib/stem-player'
import styles from './V2MidiGallery.module.css'

type Song = typeof songs[number]
type Sample = Song['samples'][number]
type Playback = { id: string | null; status: PlaybackStatus; time: number; duration: number; error?: string }
const initial: Playback = { id: null, status: 'idle', time: 0, duration: 0 }
const roles: StemRole[] = ['melody', 'accompaniment']
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`

export default function V2MidiGallery() {
  const activeRef = useRef<{ id: string; song: string; system: string; player: StemPlayer } | null>(null)
  const volumesRef = useRef(structuredClone(defaultVolumes))
  const [playback, setPlayback] = useState<Playback>(initial)
  const [volumes, setVolumes] = useState(structuredClone(defaultVolumes))
  const [expanded, setExpanded] = useState(() => new Set([songs[0].id]))
  const [mobileSamples, setMobileSamples] = useState<Record<string, number>>({})

  useEffect(() => {
    const pauseForOtherMedia = (event: Event) => {
      const active = activeRef.current
      if (active && (event as CustomEvent).detail !== active.player) active.player.pause()
    }
    document.addEventListener(MEDIA_PLAYBACK_EVENT, pauseForOtherMedia)
    return () => {
      document.removeEventListener(MEDIA_PLAYBACK_EVENT, pauseForOtherMedia)
      activeRef.current?.player.dispose()
      activeRef.current = null
    }
  }, [])

  useEffect(() => {
    if (playback.status !== 'playing') return
    const timer = window.setInterval(() => {
      const active = activeRef.current
      if (active) setPlayback(current => ({ ...current, time: active.player.currentTime }))
    }, 100)
    return () => window.clearInterval(timer)
  }, [playback.status])

  function toggle(song: Song, sample: Sample) {
    setMobileSamples(current => ({ ...current, [`${song.id}-${sample.system}`]: sample.seed }))
    let active = activeRef.current
    if (active?.id !== sample.id) {
      active?.player.dispose()
      const player = new StemPlayer(sample.stemSources, sample.duration, next => {
        if (activeRef.current?.player !== player) return
        setPlayback({ id: sample.id, status: next.status, time: player.currentTime, duration: next.duration, error: next.error })
      })
      active = { id: sample.id, song: song.id, system: sample.system, player }
      activeRef.current = active
      for (const role of roles) player.setVolume(role, volumesRef.current[role].db, volumesRef.current[role].muted)
    }
    if (active.player.state.status === 'playing' || active.player.state.status === 'loading') active.player.pause()
    else { pauseOtherMedia(active.player); void active.player.play() }
  }

  function setVolume(role: StemRole, value: Volume) {
    volumesRef.current = { ...volumesRef.current, [role]: value }
    setVolumes(volumesRef.current)
    activeRef.current?.player.setVolume(role, value.db, value.muted)
  }

  function toggleSong(id: string) {
    if (expanded.has(id) && activeRef.current?.song === id) activeRef.current.player.pause()
    setExpanded(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  function selectMobileSample(song: Song, system: string, seed: number) {
    const active = activeRef.current
    if (active?.song === song.id && active.system === system && active.id !== `${system}-${song.id}-s${seed}`) active.player.pause()
    setMobileSamples(current => ({ ...current, [`${song.id}-${system}`]: seed }))
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.systemLegend} aria-label="System colors">
        {systems.map(system => <span key={system.id} className={styles.legendItem}><i className={`${styles.swatch} ${styles[system.id]}`} aria-hidden="true" />{system.label}</span>)}
      </div>
      <div className={styles.intro}>
        <p>Three samples per system, using seeds 0, 1 and 2. Card colors identify the system.</p>
        <div className={styles.noteLegend} aria-label="Note colors"><span><i className={styles.melodyDot} />Melody</span><span><i className={styles.accompanimentDot} />Accompaniment</span></div>
      </div>
      <fieldset className={styles.mix}>
        <legend>Listening balance <span>· applies to every sample</span></legend>
        <div className={styles.mixControls}>
          {roles.map(role => {
            const volume = volumes[role], name = role === 'melody' ? 'Melody' : 'Accompaniment'
            return <div className={styles.volumeRow} key={role}>
              <label htmlFor={`midi-volume-${role}`}>{name}</label>
              <output htmlFor={`midi-volume-${role}`}>{volume.muted ? 'Muted' : `${volume.db > 0 ? '+' : ''}${volume.db} dB`}</output>
              <button type="button" className={styles.iconButton} aria-label={`${volume.muted ? 'Unmute' : 'Mute'} ${role}`} aria-pressed={volume.muted} onClick={() => setVolume(role, { ...volume, muted: !volume.muted })}>{volume.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
              <input id={`midi-volume-${role}`} className={styles.volumeSlider} type="range" min={-40} max={6} step={1} value={volume.db} aria-valuetext={`${volume.db} dB${volume.muted ? ', muted' : ''}`} onChange={event => setVolume(role, { db: Number(event.target.value), muted: false })} />
            </div>
          })}
          <button type="button" className={styles.textButton} onClick={() => roles.forEach(role => setVolume(role, { ...defaultVolumes[role] }))}>Reset balance</button>
        </div>
      </fieldset>
      <div className={styles.listControls}><span>Choose a melody to compare the three systems.</span><button type="button" className={styles.textButton} onClick={() => {
        if (expanded.size === songs.length) { activeRef.current?.player.pause(); setExpanded(new Set()) }
        else setExpanded(new Set(songs.map(song => song.id)))
      }}>{expanded.size === songs.length ? 'Collapse all' : 'Expand all'}</button></div>
      <div className={styles.songs}>
        {songs.map(song => {
          const title = getSongTitle(song.title), open = expanded.has(song.id)
          return <section className={styles.song} key={song.id} aria-labelledby={`midi-song-${song.id}`}>
            <h3 className={styles.songHeading} id={`midi-song-${song.id}`}><button type="button" aria-expanded={open} aria-controls={`midi-samples-${song.id}`} onClick={() => toggleSong(song.id)}><span className={styles.number}>{song.id}</span><span>{title}</span><ChevronDown size={19} className={open ? styles.chevronOpen : styles.chevron} aria-hidden="true" /></button></h3>
            <div id={`midi-samples-${song.id}`} hidden={!open}>
              {open ? <div className={styles.songContent}>
                <div className={styles.columns} aria-hidden="true">{[1, 2, 3].map(n => <span key={n}>Sample {n}</span>)}</div>
                {systems.map(system => {
                  const mobileSeed = mobileSamples[`${song.id}-${system.id}`] ?? 0
                  return <div key={system.id} className={`${styles.systemRow} ${styles[system.id]}`} role="group" aria-label={`${title}, ${system.label}`}>
                    <div className={styles.mobileTabs} role="group" aria-label={`${title}, ${system.label}, choose sample`}>
                      {[0, 1, 2].map(seed => <button type="button" key={seed} aria-pressed={mobileSeed === seed} onClick={() => selectMobileSample(song, system.id, seed)}>Sample {seed + 1}</button>)}
                    </div>
                    {song.samples.filter(sample => sample.system === system.id).map(sample => {
                      const active = playback.id === sample.id, status = active ? playback.status : 'idle'
                      const time = active ? playback.time : 0, duration = active && playback.duration ? playback.duration : sample.duration
                      const label = `${title}, ${system.label}, Sample ${sample.seed + 1}`
                      const playing = status === 'playing', loading = status === 'loading'
                      const action = loading ? 'Cancel loading' : playing ? 'Pause' : status === 'ended' ? 'Replay' : status === 'error' ? 'Retry' : 'Play'
                      return <article key={sample.id} className={`${styles.card} ${active ? styles.active : ''}`} data-mobile-selected={sample.seed === mobileSeed} aria-label={label}>
                        <div className={styles.cardHeader}><h4 title={system.label}>Sample {sample.seed + 1}</h4><a className={styles.download} href={sample.midiSrc} download={`${song.id}-${system.condition}_s${sample.seed}.mid`} aria-label={`Download MIDI: ${label}`}><Download size={13} aria-hidden="true" />MIDI</a></div>
                        <button className={`${styles.visual} ${playing ? styles.visualPlaying : ''}`} type="button" onClick={() => toggle(song, sample)} aria-label={`${action} ${label}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={sample.posterSrc} alt="" width={640} height={300} loading="lazy" decoding="async" draggable={false} />
                          {active && time > 0 ? <span className={styles.playhead} style={{ left: `${Math.min(100, time / song.timelineDuration * 100)}%` }} aria-hidden="true" /> : null}
                          <span className={styles.playIcon}>{loading ? <Loader2 size={21} className={styles.spinner} aria-hidden="true" /> : playing ? <Pause size={21} aria-hidden="true" /> : <Play size={21} fill="currentColor" aria-hidden="true" />}</span>
                        </button>
                        <div className={styles.controls}><span className={styles.time}>{clock(time)} <span>/ {clock(duration)}</span></span><button className={styles.iconButton} type="button" disabled={!active || loading || status === 'error'} onClick={() => activeRef.current?.player.seek(0)} aria-label={`Restart ${label}`}><RotateCcw size={13} aria-hidden="true" /></button><input type="range" className={styles.seek} aria-label={`Playback position: ${label}`} aria-valuetext={`${clock(time)} of ${clock(duration)}`} min={0} max={duration} step={0.1} value={Math.min(time, duration)} disabled={!active || loading || status === 'error'} onChange={event => activeRef.current?.player.seek(Number(event.target.value))} /></div>
                        {sample.accompanimentNotes === 0 ? <p className={styles.emptyAccompaniment}>No accompaniment generated in this sample.</p> : null}
                        {status === 'error' ? <p className={styles.error} role="alert">Audio could not load. {playback.error} Press Retry to try again.</p> : null}
                        <span className={styles.srOnly} role="status">{active ? `${label}: ${status}` : ''}</span>
                      </article>
                    })}
                  </div>
                })}
              </div> : null}
            </div>
          </section>
        })}
      </div>
      <p className={styles.footnote}>Click a piano roll to listen. All nine samples of a song share the same time and pitch scales. Download any MIDI to explore its notes.</p>
    </div>
  )
}
