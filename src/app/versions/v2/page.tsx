import { notFound } from 'next/navigation'
import VersionPage from '@/components/VersionPage'
import { getVersionBySlug } from '@/data/versions'

export default function StreamMuseV2Page() {
  const version = getVersionBySlug('v2')
  if (!version) notFound()

  return <VersionPage version={version} />
}
