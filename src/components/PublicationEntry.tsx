'use client'

import { useState } from 'react'
import { ChevronDown, Code2, ExternalLink, Quote } from 'lucide-react'
import type { StreamMuseVersion } from '@/types/project'

export default function PublicationEntry({ version }: { version: StreamMuseVersion }) {
  const [showCitation, setShowCitation] = useState(false)
  const publication = version.publication
  if (!publication) return null
  const citationId = `citation-${version.slug}`

  return (
    <article className="publication-entry" aria-label={`${version.name} publication`}>
      <div className="publication-meta">
        <span>{version.name}</span>
        <span>{version.status}</span>
      </div>
      <h3>{publication.title}</h3>
      <p className="publication-authors">{publication.authors.join(', ')}</p>
      <p className="publication-venue">{publication.venue}</p>
      <div className="publication-links">
        {publication.paperUrl ? (
          <a href={publication.paperUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={15} aria-hidden="true" /> Paper
          </a>
        ) : null}
        {version.links.code ? (
          <a href={version.links.code} target="_blank" rel="noreferrer">
            <Code2 size={16} aria-hidden="true" /> Code
          </a>
        ) : null}
        {publication.bibtex ? (
          <button type="button" aria-expanded={showCitation} aria-controls={citationId} onClick={() => setShowCitation(!showCitation)}>
            <Quote size={15} aria-hidden="true" /> Citation
            <ChevronDown size={14} aria-hidden="true" className={showCitation ? 'citation-chevron-open' : undefined} />
          </button>
        ) : null}
      </div>
      {publication.bibtex ? (
        <div id={citationId} hidden={!showCitation} className="publication-citation">
          <pre>{publication.bibtex}</pre>
        </div>
      ) : null}
    </article>
  )
}
