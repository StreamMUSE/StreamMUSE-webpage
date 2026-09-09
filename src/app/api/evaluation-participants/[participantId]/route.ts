import { validateSessionId } from '@/lib/evaluation/model'
import { failure, json } from '@/lib/evaluation/http'
import { evaluationCatalog, repository } from '@/lib/evaluation/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = 'iad1'
export async function GET(_request: Request, context: { params: Promise<{ participantId: string }> }) {
  try {
    const { participantId } = await context.params
    validateSessionId(participantId)
    return json(await repository().study(participantId, evaluationCatalog.songs.length))
  } catch (error) { return failure(error) }
}
