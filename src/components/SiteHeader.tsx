import Link from 'next/link'
import Image from 'next/image'

const navItems = [
  { href: '/#goal', label: 'Goal' },
  { href: '/#news', label: 'News' },
  { href: '/#versions', label: 'Versions' },
  { href: '/versions/v2#media', label: 'Demos' },
  { href: '/#publication', label: 'Publication' },
  { href: '/#contact', label: 'Contact' },
]

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="site-brand" aria-label="StreamMUSE home">
        <span className="brand-mark">
          <Image src="/brand/streammuse-s.png" alt="" width={32} height={32} />
        </span>
        <span>StreamMUSE</span>
      </Link>
      <nav className="site-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
