import Link from 'next/link'
import { Activity } from 'lucide-react'

const navItems = [
  { href: '/#goal', label: 'Goal' },
  { href: '/#news', label: 'News' },
  { href: '/#versions', label: 'Versions' },
  { href: '/#demos', label: 'Demos' },
  { href: '/#publication', label: 'Publication' },
  { href: '/#contact', label: 'Contact' },
]

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="site-brand" aria-label="StreamMUSE home">
        <span className="brand-mark">
          <Activity size={18} aria-hidden="true" />
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
