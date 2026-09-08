'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Headphones, Music2 } from 'lucide-react'
import { dimensions, labels, validateAnswers, type Dimension, type Label, type PublicSession } from '@/lib/evaluation/model'
import { rubric, rubricVersion } from '@/lib/evaluation/rubric'
import styles from './ListeningEvaluation.module.css'

type DraftRatings = Partial<Record<Label, Partial<Record<Dimension, number>>>>
type Draft = { sessionId: string; ratings: DraftRatings; ranking: (Label | '')[] }
const storageKey = 'streammuse-listening-evaluation-v1'
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
    if (typeof draft.sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(draft.sessionId)) return null
    const ratings: DraftRatings = {}
    for (const label of labels) for (const dimension of dimensions) {
      const score = draft.ratings?.[label]?.[dimension]
      if (Number.isInteger(score) && score >= 1 && score <= 5) ratings[label] = { ...ratings[label], [dimension]: score }
    }
    const ranking = [0, 1, 2].map(i => labels.includes(draft.ranking?.[i]) ? draft.ranking[i] : '')
    return { sessionId: draft.sessionId, ratings, ranking }
  } catch { return null }
}

function AudioPlayer({ label, src, onPlay }: { label: string; src: string; onPlay: (audio: HTMLAudioElement) => void }) {
  const [played, setPlayed] = useState(false)
  const [ended, setEnded] = useState(false)
  const [error, setError] = useState(false)
  return (
    <div className={styles.player}>
      <audio aria-label={label} controls preload="metadata" src={src}
        onPlay={event => { onPlay(event.currentTarget); setPlayed(true) }} onEnded={() => setEnded(true)}
        onError={() => setError(true)} onLoadedMetadata={() => setError(false)} />
      <span className={styles.playStatus}>{error ? 'Audio could not load. Check your connection and reload the audio.' : ended ? 'Reached the end · Replay anytime' : played ? 'Listening started · Replay or seek anytime' : 'Ready to listen · Replay or seek anytime'}</span>
      {error ? <button type="button" className={styles.textButton} onClick={event => { const audio = event.currentTarget.parentElement?.querySelector('audio'); audio?.load() }}>Reload audio</button> : null}
    </div>
  )
}

export default function ListeningEvaluation() {
  const [session, setSession] = useState<PublicSession | null>(null)
  const [ratings, setRatings] = useState<DraftRatings>({})
  const [ranking, setRanking] = useState<(Label | '')[]>(['', '', ''])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)
  const sessionId = useRef<string | null>(null)
  const activeAudio = useRef<HTMLAudioElement | null>(null)
  const inFlight = useRef(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const persist = useCallback((draft: Draft) => {
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); setStorageWarning(false) }
    catch { setStorageWarning(true) }
  }, [])

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
      let draft: Draft | null = null
      try { const saved = localStorage.getItem(storageKey); if (saved) draft = readDraft(saved) } catch { setStorageWarning(true) }
      if (draft) {
        sessionId.current = draft.sessionId
        setRatings(draft.ratings); setRanking(draft.ranking)
        try { const restored = await recover(draft.sessionId); if (!cancelled) setSession(restored) }
        catch (error) { if (!cancelled) setError((error as Error).message) }
      }
      if (!cancelled) setReady(true)
    }
    void restore()
    return () => { cancelled = true; activeAudio.current?.pause() }
  }, [recover])

  useEffect(() => {
    if (ready && sessionId.current) persist({ sessionId: sessionId.current, ratings, ranking })
  }, [ready, ratings, ranking, persist])

  async function start() {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError('')
    try {
      const isNew = !sessionId.current
      const id = sessionId.current ?? crypto.randomUUID()
      sessionId.current = id
      persist({ sessionId: id, ratings, ranking })
      const restored = isNew ? await request<PublicSession>('/api/evaluation-sessions', { sessionId: id }) : await recover(id)
      setSession(restored)
    } catch (error) { setError((error as Error).message) }
    finally { inFlight.current = false; setBusy(false) }
  }

  function onPlay(audio: HTMLAudioElement) {
    if (activeAudio.current && activeAudio.current !== audio) activeAudio.current.pause()
    activeAudio.current = audio
  }

  const ratingCount = labels.reduce((sum, label) => sum + dimensions.filter(dimension => ratings[label]?.[dimension] !== undefined).length, 0)
  const rankingComplete = ranking.every(Boolean) && new Set(ranking).size === 3
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || inFlight.current) return
    setError('')
    try { validateAnswers({ ratings, ranking }) }
    catch { setError('Please choose all nine scores and rank each sample once.'); return }
    inFlight.current = true; setBusy(true)
    try {
      const result = await request<{ submitted: boolean }>('/api/evaluations', { sessionId: session.id, ratings, ranking })
      if (!result.submitted) throw new Error('Your submission has not been confirmed. Please retry.')
      activeAudio.current?.pause()
      setSession({ ...session, submitted: true })
      requestAnimationFrame(() => statusRef.current?.focus())
    } catch (error) { setError((error as Error).message) }
    finally { inFlight.current = false; setBusy(false) }
  }

  return (
    <main className={`page-shell ${styles.page}`}>
      <Link className="back-link" href="/versions/v2"><ArrowLeft size={16} aria-hidden="true" />Back to StreamMUSE v2</Link>
      <header className={styles.hero}>
        <span className={styles.eyebrow}><Headphones size={17} aria-hidden="true" />LISTENING STUDY</span>
        <h1>One melody.<br /><span>Three interpretations.</span></h1>
        <p>Listen to three accompaniment results for the same melody. Tell us how they sound, then choose your overall order of preference.</p>
        <div className={styles.steps} aria-label="Evaluation steps"><span>01 &nbsp; Listen</span><span>02 &nbsp; Rate</span><span>03 &nbsp; Rank</span></div>
      </header>

      {storageWarning ? <p className={styles.notice} role="status">This browser cannot save your progress. Keep this page open until you have submitted.</p> : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {!ready ? <div className={styles.panel} role="status">Restoring your evaluation…</div> : session?.submitted ? (
        <div ref={statusRef} tabIndex={-1} className={`${styles.panel} ${styles.success}`} role="status">
          <CheckCircle2 size={42} aria-hidden="true" /><h2>Thank you for listening.</h2>
          <p>Your scores and ranking have been saved. Your evaluation is complete.</p>
          <Link href="/versions/v2" className={styles.button}>Return to StreamMUSE<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      ) : !session ? (
        <section className={`${styles.panel} ${styles.intro}`} aria-labelledby="before-title">
          <div className={styles.introIcon}><Music2 size={28} aria-hidden="true" /></div>
          <div><h2 id="before-title">A few minutes of careful listening</h2>
            <p>You will hear one reference melody and three anonymous samples, A, B, and C. Each sample combines the melody with a generated accompaniment.</p>
            <ul><li>Use headphones if possible and keep your volume comfortable.</li><li>Rate the accompaniment and how it works with the melody, rather than your preference for the song.</li><li>Give three scores per sample, then rank all three. You can listen again at any time.</li></ul>
            <p className={styles.finePrint}>No name, email, or account is required. We collect your scores and ranking for this research study. Your progress is saved in this browser.</p>
            <button className={styles.button} type="button" onClick={start} disabled={busy}>{busy ? 'Preparing your samples…' : sessionId.current ? 'Restore evaluation' : 'Start listening'}<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </section>
      ) : session.rubricVersion !== rubricVersion ? <div className={styles.panel}>This evaluation uses an earlier scoring guide. Please contact the study organizer to continue.</div> : (
        <form onSubmit={submit}>
          <section className={`${styles.panel} ${styles.reference}`} aria-labelledby="reference-title">
            <div><span className={styles.eyebrow}>YOUR REFERENCE</span><h2 id="reference-title">The original melody</h2><p>Listen for context. This melody is not scored.</p></div>
            <AudioPlayer label="Reference melody" src={session.reference.src} onPlay={onPlay} />
          </section>
          <div className={styles.sectionIntro}><h2>Listen &amp; rate</h2><p>Choose one score for each dimension. All five levels are described below. Higher scores mean a stronger result.</p></div>
          {session.samples.map(sample => (
            <section key={sample.label} className={`${styles.panel} ${styles.sample}`} aria-labelledby={`sample-${sample.label}`}>
              <div className={styles.sampleHeader}><div className={styles.sampleTitle}><span className={styles.sampleLetter}>{sample.label}</span><div><span className={styles.eyebrow}>MELODY + ACCOMPANIMENT</span><h2 id={`sample-${sample.label}`}>Sample {sample.label}</h2></div></div><span className={styles.count}>{dimensions.filter(d => ratings[sample.label]?.[d]).length} / 3 scored</span></div>
              <AudioPlayer label={`Sample ${sample.label}`} src={sample.src} onPlay={onPlay} />
              {rubric.map(dimension => (
                <fieldset key={dimension.id} className={styles.dimension} disabled={busy}>
                  <legend>{dimension.name}<span className={styles.srOnly}> for Sample {sample.label}</span></legend>
                  <p id={`${sample.label}-${dimension.id}-help`}>{dimension.question}</p>
                  <div className={styles.levels}>
                    {dimension.levels.map((level, i) => (
                      <label key={i} className={`${styles.level} ${ratings[sample.label]?.[dimension.id] === i + 1 ? styles.selected : ''}`}>
                        <input type="radio" name={`${sample.label}-${dimension.id}`} value={i + 1} required
                          aria-describedby={`${sample.label}-${dimension.id}-help`} checked={ratings[sample.label]?.[dimension.id] === i + 1}
                          onChange={() => setRatings(current => ({ ...current, [sample.label]: { ...current[sample.label], [dimension.id]: i + 1 } }))} />
                        <span className={styles.score}>{i + 1}</span><span className={styles.levelCopy}><strong>{level.title}</strong><span>{level.description}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>
          ))}
          <section className={`${styles.panel} ${styles.rankPanel}`} aria-labelledby="ranking-title">
            <span className={styles.eyebrow}>YOUR OVERALL PREFERENCE</span><h2 id="ranking-title">Put the three samples in order.</h2>
            <p>Consider the complete listening experience. Rank each sample once, without ties. Your order does not need to match the average of your scores.</p>
            <div className={styles.ranks}>{['1st place · Favorite', '2nd place', '3rd place'].map((title, i) => (
              <label key={title} className={styles.rank}><span>{title}</span><select aria-label={title} required value={ranking[i]} disabled={busy} onChange={event => setRanking(current => current.map((label, index) => index === i ? event.target.value as Label | '' : label))}>
                <option value="">Choose a sample</option>{labels.map(label => <option key={label} value={label} disabled={ranking.some((chosen, index) => index !== i && chosen === label)}>Sample {label}</option>)}
              </select></label>
            ))}</div>
          </section>
          <div className={styles.submitPanel}>
            <div><p className={styles.progress}><Check size={17} aria-hidden="true" />{ratingCount} of 9 scores · {rankingComplete ? 'Ranking complete' : 'Ranking needed'}</p><p className={styles.finePrint}>Your answers are saved when the submission is confirmed.</p></div>
            <button className={styles.button} type="submit" disabled={busy}>{busy ? 'Saving your evaluation…' : 'Submit evaluation'}<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
          {error ? <p role="alert" className={styles.error}>{error}</p> : null}
          <p className={styles.rubricNote}>Scoring dimensions adapted from BEAT, Appendix H.2. The five-level descriptions were written for this accompaniment study.</p>
        </form>
      )}
      <noscript><p className={styles.notice}>Please enable JavaScript to load the listening samples and submit your evaluation.</p></noscript>
    </main>
  )
}
