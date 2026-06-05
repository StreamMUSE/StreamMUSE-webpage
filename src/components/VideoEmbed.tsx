import { ExternalLink } from 'lucide-react'
import type { MediaItem } from '@/types/project'

interface VideoEmbedProps {
  item: MediaItem
}

function getYouTubeEmbedUrl(src: string) {
  if (!src) return null

  try {
    const url = new URL(src)
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace('/', '')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.split('/embed/')[1]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
  } catch {
    return null
  }

  return null
}

function getBilibiliEmbedUrl(src: string) {
  if (!src) return null

  try {
    const url = new URL(src)
    if (url.hostname.includes('player.bilibili.com')) return src
    if (url.hostname.includes('bilibili.com')) {
      const bvid = url.pathname.split('/').find((part) => part.startsWith('BV'))
      if (bvid) {
        return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1`
      }
    }
  } catch {
    return null
  }

  return null
}

export default function VideoEmbed({ item }: VideoEmbedProps) {
  if (!item.src) {
    return (
      <div className="media-empty">
        <p>{item.caption || 'Video link will be added here.'}</p>
      </div>
    )
  }

  if (item.sourceType === 'local') {
    return (
      <video className="media-video" controls preload="metadata" poster={item.poster}>
        <source src={item.src} type="video/mp4" />
        <a href={item.src}>Open video</a>
      </video>
    )
  }

  const embedUrl = item.sourceType === 'youtube' ? getYouTubeEmbedUrl(item.src) : getBilibiliEmbedUrl(item.src)

  if (embedUrl) {
    return (
      <iframe
        className="media-video"
        src={embedUrl}
        title={item.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    )
  }

  return (
    <a className="external-video-link" href={item.src} target="_blank" rel="noreferrer">
      <ExternalLink size={18} aria-hidden="true" />
      Open external video
    </a>
  )
}
