import Link from 'next/link'
import { ArrowRight, PlayCircle } from 'lucide-react'

export default function HeroProjectIntro() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">StreamMUSE</h1>
        <p className="hero-subtitle">Real-Time Music Accompaniment Generation System</p>
        <p className="hero-description">
          StreamMUSE studies how language-model generation can stay synchronized with a live musical stream, producing accompaniment that is both timely and musically coherent.
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href="/#demos">
            <PlayCircle size={18} aria-hidden="true" />
            View demos
          </Link>
          <Link className="secondary-button" href="/versions/v0">
            Open v0
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
