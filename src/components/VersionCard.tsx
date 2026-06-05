import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import PaperStatusBadge from '@/components/PaperStatusBadge'
import type { StreamMuseVersion } from '@/types/project'

interface VersionCardProps {
  version: StreamMuseVersion
}

export default function VersionCard({ version }: VersionCardProps) {
  return (
    <article className="version-card">
      <div className="version-card-topline">
        <span className="version-label">{version.shortName}</span>
        <PaperStatusBadge tone={version.statusTone}>{version.status}</PaperStatusBadge>
      </div>
      <div className="version-card-main">
        <h3>{version.name}</h3>
        <p>{version.summary}</p>
      </div>
      <Link className="text-link" href={version.links.project}>
        Open
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}
