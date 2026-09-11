import 'server-only'
import { randomInt } from 'node:crypto'
import postgres from 'postgres'
import catalogData from '@/data/evaluation-catalog.json'
import { assignSamples, type Catalog } from './model'
import { evaluationRepository } from './repository'
import { rubricVersion } from './rubric'

export const evaluationCatalog = catalogData as Catalog
export function nextRound(participantId: string, sessionId: string, previousId: string | null, origin: string | null) {
  return repository().next(participantId, sessionId, previousId, evaluationCatalog, rubricVersion, randomInt, origin)
}

let client: ReturnType<typeof postgres> | undefined
export function repository() {
  if (!process.env.DATABASE_URL) throw new Error('Evaluation database is not configured')
  client ??= postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false })
  return evaluationRepository(client, evaluationCatalog.datasetVersion)
}
export function newAssignment() {
  const catalog = catalogData as Catalog
  return { assignment: assignSamples(catalog, randomInt), dataset: catalog.datasetVersion, rubric: rubricVersion }
}
