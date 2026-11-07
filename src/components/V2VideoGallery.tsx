'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import songs from '@/data/v2-video-examples.json'
import round2Songs from '@/data/v2-round2-videos.json'
import DualViewVideoPlayer from './DualViewVideoPlayer'
import SingleViewVideoPlayer from './SingleViewVideoPlayer'
import { getSongTitle } from '@/lib/song-titles'
import styles from './V2VideoGallery.module.css'

type Song = typeof songs[number] | typeof round2Songs[number]
const durationLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`

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
        : <SingleViewVideoPlayer key={recording.id} recording={recording} title={title} />}
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
        <button type="button" aria-pressed={round === 2} onClick={() => setRound(2)}>Round 2</button>
        <button type="button" aria-pressed={round === 1} onClick={() => setRound(1)}>Round 1</button>
      </div>
      <div className={styles.grid} key={round}>{selectedSongs.map((song, index) => <SongCard key={song.id} song={song} round={round} number={index + 1} />)}</div>
    </div>
  )
}
