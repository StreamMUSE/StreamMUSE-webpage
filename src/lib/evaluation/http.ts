import { EvaluationError } from './model'

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
export function failure(error: unknown) {
  if (error instanceof EvaluationError) return json({ error: error.message }, error.status)
  // Do not log database URLs, SQL parameters, session IDs, or participant answers.
  console.error('Evaluation request failed', error instanceof Error ? error.name : 'UnknownError')
  return json({ error: 'The evaluation service is temporarily unavailable. Your answers are kept in this browser; please retry.' }, 503)
}
export function siteOrigin(request: Request) {
  const url = new URL(request.url)
  // Next.js can canonicalize request.url to localhost behind its routing layer.
  // Host describes the public site the browser actually requested.
  url.host = request.headers.get('host') || url.host
  const protocol = request.headers.get('x-forwarded-proto')
  if (protocol === 'https' || protocol === 'http') url.protocol = `${protocol}:`
  return url.origin
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get('origin')
  if (origin && origin !== siteOrigin(request)) throw new EvaluationError(403, 'Please submit from this website.')
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new EvaluationError(415, 'Expected a JSON request.')
  if (Number(request.headers.get('content-length')) > 4096) throw new EvaluationError(413, 'The request is too large.')
  const reader = request.body?.getReader()
  if (!reader) throw new EvaluationError(400, 'Missing request body.')
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 4096) { await reader.cancel(); throw new EvaluationError(413, 'The request is too large.') }
    chunks.push(value)
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
    return body as Record<string, unknown>
  } catch { throw new EvaluationError(400, 'Invalid JSON request.') }
}
