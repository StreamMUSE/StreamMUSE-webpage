'use client'

import type { PlaybackHandle } from '@/lib/evaluation/stem-player'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Headphones, Music2 } from 'lucide-react'
import { dimensions, labels, validateAnswers, type Dimension, type Label, type PublicSession, type PublicStudy } from '@/lib/evaluation/model'
import { rubric, rubricVersion, rubricGuidance } from '@/lib/evaluation/rubric'
import styles from './ListeningEvaluation.module.css'
import EvaluationPlayer from './EvaluationPlayer'
import { evaluationStorageKeys } from '@/lib/evaluation/storage'

type DraftRatings = Partial<Record<Label, Partial<Record<Dimension, number>>>>
type PendingRound = { sessionId: string; previousSessionId: string | null }
type Draft = { participantId?: string; sessionId: string | null; ratings: DraftRatings; pendingNext?: PendingRound }
const isId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
class RequestError extends Error { constructor(message: string, public status: number) { super(message) } }

async function request<T>(url: string, body?: unknown): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 25000)
  try {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET', cache: 'no-store', signal: controller.signal,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new RequestError(data.error || 'The service could not complete this request. Please retry.', response.status)
    return data as T
  } catch (error) {
    if (error instanceof RequestError) throw error
    throw new RequestError('The connection was interrupted. Your answers are kept on this page. Please retry when you are online.', 0)
  } finally { window.clearTimeout(timeout) }
}

function readDraft(value: string): Draft | null {
  try {
    const draft = JSON.parse(value)
    if (draft.sessionId !== null && !isId(draft.sessionId)) return null
    const ratings: DraftRatings = {}
    for (const label of labels) for (const dimension of dimensions) {
      const score = draft.ratings?.[label]?.[dimension]
      if (Number.isInteger(score) && score >= 1 && score <= 5) ratings[label] = { ...ratings[label], [dimension]: score }
    }
    const pending = draft.pendingNext
    const pendingNext = pending && isId(pending.sessionId) && (pending.previousSessionId === null || isId(pending.previousSessionId)) ? pending : undefined
    return { participantId: isId(draft.participantId) ? draft.participantId : undefined, sessionId: draft.sessionId, ratings, pendingNext }
  } catch { return null }
}

export default function ListeningEvaluation({ datasetVersion }: { datasetVersion: string }) {
  const { participantKey, storageKey } = evaluationStorageKeys(datasetVersion, rubricVersion)
  const [session, setSession] = useState<PublicSession | null>(null)
  const [progress, setProgress] = useState<Pick<PublicStudy, 'completed' | 'total' | 'round'> | null>(null)
  const [ratings, setRatings] = useState<DraftRatings>({})
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)
  const sessionId = useRef<string | null>(null)
  const participantId = useRef<string | null>(null)
  const pendingNext = useRef<PendingRound | undefined>(undefined)
  const answersRef = useRef({ ratings })
  answersRef.current = { ratings }
  const listeningRef = useRef<HTMLHeadingElement>(null)
  const activeAudio = useRef<PlaybackHandle | null>(null)
  const inFlight = useRef(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const persist = useCallback((draft: Draft) => {
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); setStorageWarning(false) }
    catch { setStorageWarning(true) }
  }, [storageKey])

  const applyStudy = useCallback((study: PublicStudy, requestFinished = false) => {
    const nextId = study.session?.id ?? null
    const changed = nextId !== sessionId.current
    const answers = changed ? { ratings: {} } : answersRef.current
    if (changed) { setRatings(answers.ratings) }
    if (requestFinished || (nextId && nextId !== pendingNext.current?.previousSessionId)) pendingNext.current = undefined
    sessionId.current = nextId
    setSession(study.session)
    setProgress({ completed: study.completed, total: study.total, round: study.round })
    persist({ participantId: participantId.current!, sessionId: nextId, ...answers, pendingNext: pendingNext.current })
  }, [persist])

  const recover = useCallback(async (id: string) => {
    try { return await request<PublicSession>(`/api/evaluation-sessions/${id}`) }
    catch (error) {
      // A lost creation response, or a request that never reached the server, uses the same UUID.
      if (error instanceof RequestError && error.status === 404) return request<PublicSession>('/api/evaluation-sessions', { sessionId: id })
      throw error
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function restore() {
      let draft: Draft | null = null, savedParticipant: string | null = null
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) draft = readDraft(saved)
        savedParticipant = localStorage.getItem(participantKey)
      } catch { setStorageWarning(true) }
      participantId.current = isId(savedParticipant) ? savedParticipant : draft?.participantId ?? draft?.sessionId ?? crypto.randomUUID()
      try { localStorage.setItem(participantKey, participantId.current) } catch { setStorageWarning(true) }
      if (draft) {
        sessionId.current = draft.sessionId; pendingNext.current = draft.pendingNext
        setRatings(draft.ratings)
        answersRef.current = { ratings: draft.ratings }
      }
      try {
        const study = await request<PublicStudy>(`/api/evaluation-participants/${participantId.current}`)
        if (!cancelled) applyStudy(study)
      } catch (error) {
        if (error instanceof RequestError && error.status === 404) {
          if (draft?.sessionId) {
            try {
              const restored = await recover(draft.sessionId)
              if (!cancelled) { setSession(restored); setProgress({ completed: restored.submitted ? 1 : 0, total: 10, round: 1 }) }
            } catch (legacyError) { if (!cancelled) setError((legacyError as Error).message) }
          }
        } else if (!cancelled) setError((error as Error).message)
      }
      if (!cancelled) setReady(true)
    }
    void restore()
    return () => { cancelled = true; activeAudio.current?.release() }
  }, [recover, applyStudy, participantKey, storageKey])

  useEffect(() => {
    if (ready && participantId.current && (sessionId.current || pendingNext.current)) {
      persist({ participantId: participantId.current, sessionId: sessionId.current, ratings, pendingNext: pendingNext.current })
    }
  }, [ready, ratings, persist])

  async function start() {
    if (inFlight.current || !participantId.current) return
    inFlight.current = true; setBusy(true); setError('')
    try {
      // Preserve the old round/draft until the next assignment is confirmed.
      // The same request UUID survives a lost response and a browser restart.
      if (sessionId.current && !session) {
        try {
          const study = await request<PublicStudy>(`/api/evaluation-participants/${participantId.current}`)
          applyStudy(study)
        } catch (restoreError) {
          if (!(restoreError instanceof RequestError) || restoreError.status !== 404) throw restoreError
          const restored = await recover(sessionId.current)
          setSession(restored); setProgress({ completed: restored.submitted ? 1 : 0, total: 10, round: 1 })
        }
        return
      }
      const next = pendingNext.current ?? { sessionId: crypto.randomUUID(), previousSessionId: sessionId.current }
      pendingNext.current = next
      persist({ participantId: participantId.current, sessionId: sessionId.current, ratings, pendingNext: next })
      const study = await request<PublicStudy>('/api/evaluation-rounds', { participantId: participantId.current, ...next })
      activeAudio.current?.release()
      applyStudy(study, true)
      requestAnimationFrame(() => listeningRef.current?.focus())
    } catch (error) { setError((error as Error).message) }
    finally { inFlight.current = false; setBusy(false) }
  }

  function onPlay(audio: PlaybackHandle) {
    if (activeAudio.current && activeAudio.current !== audio) activeAudio.current.release()
    activeAudio.current = audio
  }

  const ratingCount = labels.reduce((sum, label) => sum + dimensions.filter(dimension => ratings[label]?.[dimension] !== undefined).length, 0)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || inFlight.current) return
    setError('')
    try { validateAnswers({ ratings }) }
    catch { setError('Please choose one score for each sample: A, B, and C.'); return }
    inFlight.current = true; setBusy(true)
    try {
      const result = await request<{ submitted: boolean }>('/api/evaluations', { sessionId: session.id, ratings })
      if (!result.submitted) throw new Error('Your submission has not been confirmed. Please retry.')
      activeAudio.current?.release()
      setSession({ ...session, submitted: true })
      setProgress(current => current ? { ...current, completed: Math.max(current.completed, current.round) } : { completed: 1, total: 10, round: 1 })
      requestAnimationFrame(() => { statusRef.current?.focus({ preventScroll: true }); statusRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) })
    } catch (error) { setError((error as Error).message) }
    finally { inFlight.current = false; setBusy(false) }
  }

  const complete = !!progress && progress.completed >= progress.total

  return (
    <main className={`page-shell ${styles.page}`}>
      <Link className="back-link" href="/versions/v2"><ArrowLeft size={16} aria-hidden="true" />Back to StreamMUSE v2</Link>
      <header className={styles.hero}>
        <span className={styles.eyebrow}><Headphones size={17} aria-hidden="true" />LISTENING STUDY</span>
        <h1>One melody.<br /><span>Three interpretations.</span></h1>
        <p>Listen to three accompaniment results for the same melody. Give each sample one score for how naturally its accompaniment supports the melody.</p>
        <div className={styles.steps} aria-label="Evaluation steps"><span>01 &nbsp; Listen</span><span>02 &nbsp; Rate</span><span>03 &nbsp; Submit</span></div>
      </header>

      {storageWarning ? <p className={styles.notice} role="status">This browser cannot save your progress. Keep this page open until you have submitted.</p> : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {!ready ? <div className={styles.panel} role="status">Restoring your evaluation…</div> : session?.submitted ? (
        <div ref={statusRef} tabIndex={-1} className={`${styles.panel} ${styles.success}`} role="status">
          <CheckCircle2 size={42} aria-hidden="true" /><h2>{complete ? 'All 10 melodies complete.' : 'This round is saved.'}</h2>
          <p>{complete ? 'Thank you for listening. All your scores have been saved.' : 'Your scores have been saved. Continue with a different melody whenever you are ready.'}</p>
          <p className={styles.progressCount}>{progress?.completed ?? 1} / {progress?.total ?? 10} melodies completed</p>
          {!complete ? <button type="button" className={styles.button} onClick={start} disabled={busy}>{busy ? 'Preparing your next melody…' : 'Listen to the next melody'}<ArrowRight size={17} aria-hidden="true" /></button> : null}
          <p className={styles.finePrint}>{complete ? 'Your listening study is complete.' : 'You can close this page and return later in the same browser. Your progress will be remembered.'}</p>
          <Link href="/versions/v2" className={styles.textButton}>Return to StreamMUSE</Link>
        </div>
      ) : !session ? (
        <section className={`${styles.panel} ${styles.intro}`} aria-labelledby="before-title">
          <div className={styles.introIcon}><Music2 size={28} aria-hidden="true" /></div>
          <div><h2 id="before-title">A few minutes of careful listening</h2>
            <p>You will hear one reference melody and three anonymous samples, A, B, and C. Each sample combines the melody with a generated accompaniment.</p>
            <ul><li>Use headphones if possible and keep your volume comfortable.</li><li>Rate the accompaniment and how it works with the melody, rather than your preference for the song.</li><li>Give one score per sample. Equal scores are welcome. You can listen again at any time.</li></ul>
            <p className={styles.finePrint}>No name, email, or account is required. We collect your scores for this research study. You can evaluate up to 10 different melodies. Your progress is saved in this browser, including when you close this page.</p>
            <button className={styles.button} type="button" onClick={start} disabled={busy}>{busy ? 'Preparing your samples…' : sessionId.current ? 'Restore evaluation' : 'Start listening'}<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </section>
      ) : session.rubricVersion !== rubricVersion ? <div className={styles.panel}>This evaluation uses an earlier scoring guide. Reload the page to start the simplified study.</div> : (
        <form key={session.id} onSubmit={submit}>
          <p className={styles.roundProgress} role="status">Melody {progress?.round ?? 1} of {progress?.total ?? 10} · {progress?.completed ?? 0} completed</p>
          <section className={`${styles.panel} ${styles.reference}`} aria-labelledby="reference-title">
            <div><span className={styles.eyebrow}>YOUR REFERENCE</span><h2 ref={listeningRef} tabIndex={-1} id="reference-title">The original melody</h2><p>Listen for context. This melody is not scored.</p></div>
            <EvaluationPlayer reference label="Reference melody" asset={session.reference} onPlay={onPlay} />
          </section>
          <div className={styles.sectionIntro}>
            <h2>One score per sample</h2>
            <p>{rubricGuidance}</p>
            <p>Some recordings begin with melody alone. Listen beyond the opening before rating the accompaniment. You can give A, B, and C the same score.</p>
            <details className={styles.guide} open>
              <summary>Scoring guide · 1–5</summary>
              <ol>{rubric[0].levels.map((level, i) => <li key={i} id={`quality-level-${i + 1}`}><strong>{i + 1} · {level.title}</strong><span>{level.description}</span></li>)}</ol>
            </details>
          </div>
          {session.samples.map(sample => (
            <section key={sample.label} className={`${styles.panel} ${styles.sample}`} aria-labelledby={`sample-${sample.label}`}>
              <div className={styles.sampleHeader}><div className={styles.sampleTitle}><span className={styles.sampleLetter}>{sample.label}</span><div><span className={styles.eyebrow}>MELODY + ACCOMPANIMENT</span><h2 id={`sample-${sample.label}`}>Sample {sample.label}</h2></div></div><span className={styles.count}>{ratings[sample.label]?.quality ? 'Scored' : 'Choose one score'}</span></div>
              <EvaluationPlayer label={`Sample ${sample.label}`} asset={sample} onPlay={onPlay} />
              {rubric.map(dimension => (
                <fieldset key={dimension.id} className={styles.dimension} disabled={busy}>
                  <legend>{dimension.name}<span className={styles.srOnly}> for Sample {sample.label}</span></legend>
                  <p id={`${sample.label}-${dimension.id}-help`}>{dimension.question}</p>
                  <div className={styles.levels}>
                    {dimension.levels.map((level, i) => (
                      <label key={i} className={`${styles.level} ${ratings[sample.label]?.[dimension.id] === i + 1 ? styles.selected : ''}`}>
                        <input type="radio" name={`${sample.label}-${dimension.id}`} value={i + 1} required
                          aria-describedby={`${sample.label}-${dimension.id}-help quality-level-${i + 1}`} checked={ratings[sample.label]?.[dimension.id] === i + 1}
                          onChange={() => setRatings(current => ({ ...current, [sample.label]: { ...current[sample.label], [dimension.id]: i + 1 } }))} />
                        <span className={styles.score}>{i + 1}</span><span className={styles.levelCopy}><strong>{level.title}</strong></span>
                      </label>
                    ))}
                  </div>
                  <p className={styles.selectedDescription} role="status">{ratings[sample.label]?.quality ? dimension.levels[ratings[sample.label]!.quality! - 1].description : 'Choose the description that best reflects the overall accompaniment quality.'}</p>
                </fieldset>
              ))}
            </section>
          ))}
          <div className={styles.submitPanel}>
            <div><p className={styles.progress}><Check size={17} aria-hidden="true" />{ratingCount} of 3 scores</p><p className={styles.finePrint}>Your answers are saved when the submission is confirmed.</p></div>
            <button className={styles.button} type="submit" disabled={busy}>{busy ? 'Saving your evaluation…' : 'Submit evaluation'}<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
          {error ? <p role="alert" className={styles.error}>{error}</p> : null}
          <p className={styles.rubricNote}>This study-specific scoring guide considers melody fit and whether repetition and changes respond appropriately to the melody’s development.</p>
        </form>
      )}
      <noscript><p className={styles.notice}>Please enable JavaScript to load the listening samples and submit your evaluation.</p></noscript>
    </main>
  )
}
