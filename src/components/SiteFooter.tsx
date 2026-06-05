import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer id="contact" className="site-footer">
      <div>
        <p className="footer-title">StreamMUSE</p>
        <p>Real-time music accompaniment research project.</p>
      </div>
      <div className="footer-links">
        <Link href="/versions/v0">v0</Link>
        <Link href="/versions/v1">v1</Link>
        <Link href="/versions/v2">v2</Link>
        <a href="https://github.com/StreamMUSE/AE" target="_blank" rel="noreferrer">
          Code
        </a>
      </div>
    </footer>
  )
}
