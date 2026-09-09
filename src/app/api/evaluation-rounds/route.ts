import { EvaluationError, validateSessionId } from '@/lib/evaluation/model'
import { failure, json, readBody, siteOrigin } from '@/lib/evaluation/http'
import { nextRound } from '@/lib/evaluation/server'

export const runtime = 'nodejs'
export const preferredRegion = 'iad1'
export async function POST(request: Request) {
  try {
    const body = await readBody(request)
    if (Object.keys(body).length !== 3 || !['participantId', 'sessionId', 'previousSessionId'].every(key => key in body)) {
      throw new EvaluationError(400, 'Unexpected round fields.')
    }
    validateSessionId(body.participantId); validateSessionId(body.sessionId)
    if (body.previousSessionId !== null) validateSessionId(body.previousSessionId)
    return json(await nextRound(body.participantId, body.sessionId, body.previousSessionId as string | null, siteOrigin(request)))
  } catch (error) { return failure(error) }
}
