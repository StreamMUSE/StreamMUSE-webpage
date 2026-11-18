import HeroProjectIntro from '@/components/HeroProjectIntro'
import MediaGallery from '@/components/MediaGallery'
import MidiAssetList from '@/components/MidiAssetList'
import SectionHeading from '@/components/SectionHeading'
import VersionCard from '@/components/VersionCard'
import PublicationEntry from '@/components/PublicationEntry'
import { getFeaturedMedia, getFeaturedMidi, streamMuseVersions } from '@/data/versions'

export default function Home() {
  const featuredMedia = getFeaturedMedia(4)
  const featuredMidi = getFeaturedMidi(3)

  return (
    <main>
      <HeroProjectIntro />

      <section id="goal" className="content-section">
        <SectionHeading
          eyebrow="Goal"
          title="Real-time accompaniment generation as a systems problem"
          description="StreamMUSE focuses on generation that reacts to a live musical stream while staying aligned with the musical clock."
        />
        <div className="prose-block">
          <p>
            StreamMUSE explores live music accompaniment as a real-time generation problem. Instead of generating an entire accompaniment offline, the system must continuously listen to the incoming musical context and produce the next accompaniment frames on time.
          </p>
          <p>
            This makes the task both musical and system-oriented: the output should be coherent with the melody and previous accompaniment, while the inference loop must stay responsive under latency constraints.
          </p>
          <p>
            Our goal is to understand this tradeoff and design a system that satisfies real-time constraints while achieving the best possible musical quality.
          </p>
        </div>
      </section>

      <section id="news" className="content-section">
        <SectionHeading eyebrow="News" title="Latest updates" />
        <div className="news-list">
          <article className="news-item">
            <time dateTime="2026-10">October 2026</time>
            <div>
              <h3>StreamMUSE+ accepted by ISMIR 2026 LBD</h3>
              <p>
                <span>StreamMUSE+: Towards More Stable and Interactive Real-Time Piano Accompaniment Generation</span> was accepted by ISMIR 2026 Late-Breaking/Demo (LBD).
              </p>
              <a className="text-link" href="https://ismir2026program.ismir.net/lbd_655.html#detail" target="_blank" rel="noreferrer">
                Official ISMIR 2026 page
              </a>
            </div>
          </article>
          <article className="news-item">
            <time dateTime="2026-01">January 2026</time>
            <div>
              <h3>StreamMUSE v0 accepted by RTAS 2026</h3>
              <p>
                The v0 paper, <span>Real-Time Language Model Jamming: A Case Study for Live Music Accompaniment Generation</span>, was accepted by RTAS 2026.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="versions" className="content-section">
        <SectionHeading
          eyebrow="Versions"
          title="Project versions"
          description="Each version has its own page for system notes, media, MIDI examples, and publication status."
        />
        <div className="version-list">
          {streamMuseVersions.map((version) => (
            <VersionCard key={version.slug} version={version} />
          ))}
        </div>
      </section>

      <section id="demos" className="content-section">
        <SectionHeading
          eyebrow="Demos"
          title="Recorded demos and media slots"
          description="Local videos, YouTube/Bilibili embeds, and MIDI assets share one data-driven media structure."
        />
        <h3 className="demo-subheading">Video</h3>
        <MediaGallery items={featuredMedia} />
        {featuredMidi.length > 0 ? (
          <div className="demo-group">
            <h3 className="demo-subheading">MIDI</h3>
            <MidiAssetList items={featuredMidi} />
          </div>
        ) : null}
      </section>

      <section id="publication" className="content-section publication-list" aria-label="Publications">
        <SectionHeading eyebrow="Publication" title="Research publications" />
        {streamMuseVersions.filter((version) => version.publication).map((version) => (
          <PublicationEntry key={version.slug} version={version} />
        ))}
      </section>
    </main>
  )
}
