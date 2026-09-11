import type { StemSources } from './stem-player'
export const labels = ['A', 'B', 'C'] as const
export const versions = ['v0', 'v1', 'v2'] as const
export const dimensions = ['coherence', 'plausibility', 'musicality'] as const
export type Label = typeof labels[number]
export type Version = typeof versions[number]
export type Dimension = typeof dimensions[number]
export type Ratings = Record<Label, Record<Dimension, number>>
export type Answers = { ratings: Ratings; ranking: Label[] }
export type Asset = { id: string; src: string; duration: number; visualizationSrc?: string; stemSources?: StemSources }
export type Sample = Asset & { version: Version; seed: number }
export type Song = { id: string; reference: Asset; samples: Sample[] }
export type Catalog = { datasetVersion: string; songs: Song[] }
export type Assignment = { songId: string; reference: Asset; samples: Record<Label, Sample> }
export type StoredSession = {
  id: string; dataset_version: string; rubric_version: string; song_id: string
  assignment: Assignment; created_at: Date | string
  participant_id?: string | null; round_number?: number | null
}
export type PublicSession = {
  id: string; rubricVersion: string; reference: Asset
  samples: (Asset & { label: Label })[]; submitted: boolean
}

export type PublicStudy = { session: PublicSession | null; completed: number; total: number; round: number }

export class EvaluationError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function validateSessionId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new EvaluationError(400, 'This evaluation link is invalid.')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
}

// Return a canonical copy: comparisons must not depend on the order of JSON keys.
export function validateAnswers(value: unknown): Answers {
  const invalid = () => new EvaluationError(400, 'Choose all nine scores and rank A, B, and C once each.')
  if (!isRecord(value) || !exactKeys(value, ['ratings', 'ranking']) || !isRecord(value.ratings) || !exactKeys(value.ratings, labels)) throw invalid()
  const ratings = {} as Ratings
  for (const label of labels) {
    const scores = value.ratings[label]
    if (!isRecord(scores) || !exactKeys(scores, dimensions)) throw invalid()
    ratings[label] = {} as Record<Dimension, number>
    for (const dimension of dimensions) {
      const score = scores[dimension]
      if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) throw invalid()
      ratings[label][dimension] = score
    }
  }
  if (!Array.isArray(value.ranking) || value.ranking.length !== 3 || new Set(value.ranking).size !== 3 || !value.ranking.every(label => labels.includes(label))) throw invalid()
  return { ratings, ranking: [...value.ranking] as Label[] }
}

export function assignSamples(catalog: Catalog, randomInt: (max: number) => number): Assignment {
  const song = catalog.songs[randomInt(catalog.songs.length)]
  const selected = versions.map(version => {
    const seeds = song.samples.filter(sample => sample.version === version).sort((a, b) => a.seed - b.seed)
    if (seeds.length !== 3 || seeds.some((sample, index) => sample.seed !== index)) throw new Error('Invalid evaluation catalog')
    return seeds[randomInt(3)]
  })
  for (let i = selected.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[selected[i], selected[j]] = [selected[j], selected[i]]
  }
  // Only the fields needed to reproduce this evaluation are stored in the assignment.
  const asset = ({ id, src, duration, visualizationSrc, stemSources }: Asset): Asset => ({ id, src, duration, visualizationSrc, stemSources })
  return {
    songId: song.id, reference: asset(song.reference),
    samples: Object.fromEntries(labels.map((label, i) => [label, { ...asset(selected[i]), version: selected[i].version, seed: selected[i].seed }])) as Record<Label, Sample>,
  }
}

export function publicSession(session: StoredSession, submitted: boolean): PublicSession {
  const asset = ({ id, src, duration, visualizationSrc, stemSources }: Asset): Asset => ({ id, src, duration, visualizationSrc: visualizationSrc ?? `/media/evaluation/${id}.json`, stemSources: { melody: stemSources?.melody ?? `/media/evaluation/${id}-melody.mp3`, accompaniment: stemSources?.accompaniment ?? `/media/evaluation/${id}-accompaniment.mp3` } })
  return {
    id: session.id, rubricVersion: session.rubric_version, reference: asset(session.assignment.reference), submitted,
    samples: labels.map(label => ({ label, ...asset(session.assignment.samples[label]) })),
  }
}
