import MediaGallery from '@/components/MediaGallery'
import MidiAssetList from '@/components/MidiAssetList'
import SectionHeading from '@/components/SectionHeading'
import VersionHero from '@/components/VersionHero'
import type { StreamMuseVersion } from '@/types/project'
import V2MidiGallery from '@/components/V2MidiGallery'
import V2VideoGallery from '@/components/V2VideoGallery'

interface VersionPageProps {
  version: StreamMuseVersion
}

export default function VersionPage({ version }: VersionPageProps) {
  return (
    <main className="page-shell">
      <VersionHero version={version} />

      <section className="content-section" aria-labelledby="summary-title">
        <SectionHeading eyebrow={version.shortName} title={version.slug === 'v2' ? 'How it works' : 'Version Summary'} description={version.slug === 'v2' ? 'Beat-wise generation, prompt-based startup, and live interaction.' : 'What this version contributes to the StreamMUSE project.'} />
        <div className="prose-block">
          {version.details.map((detail) => (
            <p key={detail}>{detail}</p>
          ))}
        </div>
      </section>

      <section id="media" className="content-section" aria-label={version.slug === 'v2' ? 'Demo Videos' : 'Real-time demos'}>
        <SectionHeading eyebrow="Recorded demos" title={version.slug === 'v2' ? 'Demo Videos' : 'Real-time'} description={version.slug === 'v2' ? `We tested ${version.name} with a human performer playing melodies from Chinese and Japanese pop songs. Each round is a separate recording session, and each take is one performance of a song within that session. Not every song was tested in every round, and some songs have only one take in a round. Round 2 includes synchronized camera and screen recordings.` : 'A human performer plays the melody, while the system generates accompaniment in real time.'} />
        {version.slug === 'v2' ? <V2VideoGallery /> : <MediaGallery items={version.media} />}
        {version.simulationMedia && version.simulationMedia.length > 0 ? (
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

      {version.slug === 'v2' || version.midi.length > 0 ? (
        <section id="midi" className="content-section" aria-label="MIDI Examples">
          <SectionHeading eyebrow="Playable assets" title="MIDI Examples" description={version.slug === 'v2' ? 'Ten recorded melodies, three systems, and three accompaniment samples per system.' : 'MIDI examples can be played directly in the browser or downloaded.'} />
          {version.slug === 'v2' ? (
            <div className="prose-block midi-method">
              <p>We invited a musician to perform the melodies of ten different songs and recorded the melody part as MIDI. Each recording was then replayed through StreamMUSE+, StreamMUSE+ without the prompt model (w/o Prompt), and StreamMUSE in real-time simulation, feeding the melody to each system incrementally as a live performer would. We ran each system three times per song with different random seeds to produce the samples below.</p>
              <p>The simulation uses the same generation and playback process as live performance. With the same melody input and system settings, these examples should therefore, in principle, reflect the accompaniment a real user would hear while playing. Different seeds produce variations in density, register, and texture.</p>
            </div>
          ) : null}
          {version.slug === 'v2' ? <V2MidiGallery /> : <MidiAssetList items={version.midi} />}
        </section>
      ) : null}

      {version.slug !== 'v0' && (version.notes.length > 0 || version.roadmap) ? (
        <section className="content-section" aria-labelledby="results-title">
          <SectionHeading eyebrow="Notes" title={version.slug === 'v2' ? 'Evaluation and limitations' : 'Results And Status'} description={version.slug === 'v2' ? 'Findings from controlled experiments and an initial performance pilot.' : 'Current observations, status notes, and future additions.'} />
          <div className="notes-grid">
            {version.notes.map((note) => (
              <article key={note} className="note-card">
                <p>{note}</p>
              </article>
            ))}
          </div>
          {version.roadmap ? (
            <div className="roadmap-panel">
              <h3>{version.slug === 'v2' ? 'Future work' : 'Roadmap'}</h3>
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
