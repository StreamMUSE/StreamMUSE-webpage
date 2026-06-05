import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import PaperStatusBadge from '@/components/PaperStatusBadge'
import type { StreamMuseVersion } from '@/types/project'

interface VersionHeroProps {
  version: StreamMuseVersion
}

export default function VersionHero({ version }: VersionHeroProps) {
  return (
    <section className="version-hero">
      <Link className="back-link" href="/#versions">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to versions
      </Link>
      {version.slug === 'v2' ? <PaperStatusBadge tone={version.statusTone}>{version.status}</PaperStatusBadge> : null}
      <h1>{version.name}</h1>
      <p className="version-focus">{version.focus}</p>
      <p>{version.summary}</p>
      <div className="version-links">
        {version.links.paper ? (
          <a href={version.links.paper} target="_blank" rel="noreferrer">
            Paper
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        ) : null}
        {version.links.code ? (
          <a href={version.links.code} target="_blank" rel="noreferrer">
            Code
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        ) : null}
        <a href="#media">Media</a>
        <a href="#midi">MIDI</a>
      </div>
    </section>
  )
}
