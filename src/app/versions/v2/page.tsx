import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import VersionPage from '@/components/VersionPage'
import { getVersionBySlug } from '@/data/versions'

export const metadata: Metadata = {
  title: 'StreamMUSE+',
  description: 'Explore recorded accompaniment demos and MIDI examples from StreamMUSE+.',
}

export default function StreamMuseV2Page() {
  const version = getVersionBySlug('v2')
  if (!version) notFound()

  return <VersionPage version={version} />
}
