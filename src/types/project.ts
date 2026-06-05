export type VersionStatusTone = 'publication' | 'active' | 'development' | 'neutral'

export type MediaSourceType = 'local' | 'youtube' | 'bilibili' | 'external'

export type MediaKind = 'video' | 'midi'

export interface PublicationInfo {
  title: string
  venue: string
  status: string
  authors: string[]
  doi?: string
  paperUrl?: string
  bibtex?: string
}

export interface MediaItem {
  id: string
  title: string
  kind: MediaKind
  sourceType: MediaSourceType
  src: string
  poster?: string
  caption?: string
  duration?: string
  scenario?: string
  versionLabel?: string
}

export interface MidiItem {
  id: string
  title: string
  src: string
  caption?: string
  duration?: string
  scenario?: string
  downloadName?: string
}

export interface ProjectLinkSet {
  project: string
  paper?: string
  code?: string
  demo?: string
}

export interface StreamMuseVersion {
  slug: 'v0' | 'v1' | 'v2'
  name: string
  shortName: string
  status: string
  statusTone: VersionStatusTone
  summary: string
  focus: string
  details: string[]
  links: ProjectLinkSet
  publication?: PublicationInfo
  media: MediaItem[]
  simulationMedia?: MediaItem[]
  midi: MidiItem[]
  notes: string[]
  roadmap?: string[]
}
