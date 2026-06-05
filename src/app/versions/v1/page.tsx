import { notFound } from 'next/navigation'
import VersionPage from '@/components/VersionPage'
import { getVersionBySlug } from '@/data/versions'

export default function StreamMuseV1Page() {
  const version = getVersionBySlug('v1')
  if (!version) notFound()

  return <VersionPage version={version} />
}
