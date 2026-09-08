import { EvaluationError, validateAnswers, validateSessionId } from '@/lib/evaluation/model'
import { failure, json, readBody } from '@/lib/evaluation/http'
import { repository } from '@/lib/evaluation/server'

export const runtime = 'nodejs'
export const preferredRegion = 'iad1'
export async function POST(request: Request) {
  try {
    const { sessionId, ...body } = await readBody(request)
    validateSessionId(sessionId)
    if (Object.keys(body).length !== 2) throw new EvaluationError(400, 'Unexpected answer fields.')
    const answers = validateAnswers(body)
    return json(await repository().submit(sessionId, answers))
  } catch (error) { return failure(error) }
}
