import VideoEmbed from '@/components/VideoEmbed'
import type { MediaItem } from '@/types/project'

interface MediaGalleryProps {
  items: MediaItem[]
}

export default function MediaGallery({ items }: MediaGalleryProps) {
  if (items.length === 0) {
    return (
      <div className="empty-panel">
        <p>Recorded videos will be added when this version has public demo assets.</p>
      </div>
    )
  }

  return (
    <div className="media-grid">
      {items.map((item) => (
        <article key={item.id} className="media-card">
          <div className="media-frame">
            <VideoEmbed item={item} />
          </div>
          <div className="media-card-body">
            <div className="media-card-meta">
              {item.versionLabel ? <span>{item.versionLabel}</span> : null}
              {item.duration ? <span>{item.duration}</span> : null}
              {item.scenario ? <span>{item.scenario}</span> : null}
            </div>
            <h3>{item.title}</h3>
            {item.caption ? <p>{item.caption}</p> : null}
          </div>
        </article>
      ))}
    </div>
  )
}
