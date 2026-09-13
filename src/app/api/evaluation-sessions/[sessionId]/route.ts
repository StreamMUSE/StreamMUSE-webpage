import { publicSession, validateSessionId } from '@/lib/evaluation/model'
import { failure, json } from '@/lib/evaluation/http'
import { repository } from '@/lib/evaluation/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = 'iad1'
export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await context.params
    validateSessionId(sessionId)
    const { session, submitted } = await repository().get(sessionId)
    return json(publicSession(session, submitted))
  } catch (error) { return failure(error) }
}
