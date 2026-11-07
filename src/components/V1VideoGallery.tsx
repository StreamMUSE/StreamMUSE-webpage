import { ExternalLink } from 'lucide-react'
import recordings from '@/data/v1-video-examples.json'
import singleRecordings from '@/data/v1-single-videos.json'
import DualViewVideoPlayer from './DualViewVideoPlayer'
import SingleViewVideoPlayer from './SingleViewVideoPlayer'
import styles from './V2VideoGallery.module.css'
import groups from './V1VideoGallery.module.css'

const durationLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`

export default function V1VideoGallery() {
  return (
    <div>
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
      {(['camera', 'screen'] as const).map(view => (
        <section key={view} className={groups.group} aria-labelledby={`v1-${view}-recordings`}>
          <h3 className={groups.title} id={`v1-${view}-recordings`}>{view === 'camera' ? 'Camera recordings' : 'Screen recordings'}</h3>
          <div className={styles.grid}>
            {singleRecordings.filter(recording => recording.view === view).map(recording => (
              <article key={recording.id} className={styles.card} aria-labelledby={`${recording.id}-title`}>
                <header className={styles.heading}>
                  <h4 id={`${recording.id}-title`}>{recording.title}</h4>
                  <span className={styles.duration}>{durationLabel(recording.duration)}</span>
                </header>
                <SingleViewVideoPlayer recording={recording} title={recording.title} />
                <footer className={styles.footer}>
                  <a className={styles.open} href={recording.src} target="_blank" rel="noreferrer"
                    aria-label={`Open ${view} MP4: ${recording.title}`}>
                    {view === 'camera' ? 'Camera' : 'Screen'} MP4 <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </footer>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
