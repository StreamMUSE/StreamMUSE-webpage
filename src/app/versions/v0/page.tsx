import { notFound } from 'next/navigation'
import VersionPage from '@/components/VersionPage'
import { getVersionBySlug } from '@/data/versions'

export default function StreamMuseV0Page() {
  const version = getVersionBySlug('v0')
  if (!version) notFound()

  return <VersionPage version={version} />
}
