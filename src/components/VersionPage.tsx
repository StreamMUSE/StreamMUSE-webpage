import MediaGallery from '@/components/MediaGallery'
import MidiAssetList from '@/components/MidiAssetList'
import SectionHeading from '@/components/SectionHeading'
import VersionHero from '@/components/VersionHero'
import type { StreamMuseVersion } from '@/types/project'

interface VersionPageProps {
  version: StreamMuseVersion
}

export default function VersionPage({ version }: VersionPageProps) {
  return (
    <main className="page-shell">
      <VersionHero version={version} />

      <section className="content-section" aria-labelledby="summary-title">
        <SectionHeading eyebrow={version.shortName} title="Version Summary" description="What this version contributes to the StreamMUSE project." />
        <div className="prose-block">
          {version.details.map((detail) => (
            <p key={detail}>{detail}</p>
          ))}
        </div>
      </section>

      <section id="media" className="content-section" aria-labelledby="media-title">
        <SectionHeading eyebrow="Recorded demos" title="Real-time" description="A human performer plays the melody, while the system generates accompaniment in real time." />
        <MediaGallery items={version.media} />
        {version.simulationMedia ? (
          <div className="demo-group">
            <SectionHeading
              eyebrow="Recorded demos"
              title="Realtime Simulation"
              description="This is still a real-time setting, but the melody is played by a machine rather than a human performer. Compared with the non-simulator setting, the simulator removes human performance errors from the evaluation."
            />
            <MediaGallery items={version.simulationMedia} />
          </div>
        ) : null}
      </section>

      <section id="midi" className="content-section" aria-labelledby="midi-title">
        <SectionHeading eyebrow="Playable assets" title="MIDI Examples" description="MIDI examples can be played directly in the browser or downloaded." />
        <MidiAssetList items={version.midi} />
      </section>

      {version.slug !== 'v0' && (version.notes.length > 0 || version.roadmap) ? (
        <section className="content-section" aria-labelledby="results-title">
          <SectionHeading eyebrow="Notes" title="Results And Status" description="Current observations, status notes, and future additions." />
          <div className="notes-grid">
            {version.notes.map((note) => (
              <article key={note} className="note-card">
                <p>{note}</p>
              </article>
            ))}
          </div>
          {version.roadmap ? (
            <div className="roadmap-panel">
              <h3>Roadmap</h3>
              <ul>
                {version.roadmap.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {version.publication ? (
        <section className="content-section publication-card" aria-labelledby="version-publication-title">
          <SectionHeading eyebrow="Publication" title="Paper Information" />
          <h3>{version.publication.title}</h3>
          <p>{version.publication.venue}</p>
          <p>{version.publication.authors.join(', ')}</p>
          {version.publication.doi ? <p>DOI: {version.publication.doi}</p> : null}
          {version.publication.bibtex ? <pre>{version.publication.bibtex}</pre> : null}
        </section>
      ) : null}
    </main>
  )
}
