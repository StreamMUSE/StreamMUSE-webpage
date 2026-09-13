import { EvaluationError, publicSession, validateSessionId } from '@/lib/evaluation/model'
import { failure, json, readBody, siteOrigin } from '@/lib/evaluation/http'
import { newAssignment, repository } from '@/lib/evaluation/server'

export const runtime = 'nodejs'
export const preferredRegion = 'iad1'
export async function POST(request: Request) {
  try {
    const body = await readBody(request)
    if (Object.keys(body).length !== 1) throw new EvaluationError(400, 'Unexpected evaluation fields.')
    validateSessionId(body.sessionId)
    const { assignment, dataset, rubric } = newAssignment()
    const { session, submitted } = await repository().create(body.sessionId, dataset, rubric, assignment, siteOrigin(request))
    return json(publicSession(session, submitted))
  } catch (error) { return failure(error) }
}
