import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StreamMUSE',
  description: 'Project page for real-time music accompaniment research.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
