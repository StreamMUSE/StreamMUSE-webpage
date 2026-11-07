import { ExternalLink } from 'lucide-react'
import recordings from '@/data/v1-video-examples.json'
import DualViewVideoPlayer from './DualViewVideoPlayer'
import styles from './V2VideoGallery.module.css'

const durationLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`

export default function V1VideoGallery() {
  return (
    <div className={styles.grid}>
      {recordings.map(recording => (
        <article key={recording.id} className={styles.card} aria-labelledby={`${recording.id}-title`}>
          <header className={styles.heading}>
            <h3 id={`${recording.id}-title`}>{recording.title}</h3>
            <span className={styles.duration}>{durationLabel(recording.duration)}</span>
          </header>
          <DualViewVideoPlayer recording={recording} title={recording.title} />
          <footer className={styles.footer}>
            {(['camera', 'screen'] as const).map(view => (
              <a key={view} className={styles.open} href={recording[view].src} target="_blank" rel="noreferrer"
                aria-label={`Open ${view} MP4: ${recording.title}`}>
                {view === 'camera' ? 'Camera' : 'Screen'} MP4 <ExternalLink size={13} aria-hidden="true" />
              </a>
            ))}
          </footer>
        </article>
      ))}
    </div>
  )
}
