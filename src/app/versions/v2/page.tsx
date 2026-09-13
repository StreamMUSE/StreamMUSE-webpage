import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import VersionPage from '@/components/VersionPage'
import { getVersionBySlug } from '@/data/versions'

export const metadata: Metadata = {
  title: 'StreamMUSE+',
  description: 'StreamMUSE+ combines BEAT-based generation, prompt-based startup, and live interaction for more stable real-time piano accompaniment. Explore demos and MIDI examples.',
}

export default function StreamMuseV2Page() {
  const version = getVersionBySlug('v2')
  if (!version) notFound()

  return <VersionPage version={version} />
}
