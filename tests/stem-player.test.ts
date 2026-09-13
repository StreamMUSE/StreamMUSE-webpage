import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { StemPlayer, defaultVolumes, volumeGain } from '../src/lib/evaluation/stem-player'
import { assignSamples, publicSession, type Catalog } from '../src/lib/evaluation/model'
import catalog from '../src/data/evaluation-catalog.json'
import audit from '../docs/evaluation/audio-audit.json'

function harness(request?: typeof fetch) {
  const sources: { startArgs: number[]; stopped: boolean; onended: (() => void) | null }[] = []
  const gains: { gain: { value: number; target?: number; setTargetAtTime(value: number): void } }[] = []
  let requests = 0, resumes = 0
  const context = {
    currentTime: 10, state: 'running', destination: {},
    resume: async () => { resumes++ }, addEventListener() {}, removeEventListener() {},
    decodeAudioData: async () => ({ duration: 60 }),
    createGain() {
      const gain = { gain: { value: 0, target: undefined as number | undefined, setTargetAtTime(value: number) { this.target = value } }, connect() {}, disconnect() {} }
      gains.push(gain); return gain
    },
    createBufferSource() {
      const source = { buffer: null, onended: null as (() => void) | null, startArgs: [] as number[], stopped: false,
        start(...args: number[]) { this.startArgs = args }, stop() { this.stopped = true }, connect() {}, disconnect() {} }
      sources.push(source); return source
    },
  }
  const fetcher = request ?? (async () => { requests++; return new Response(new ArrayBuffer(8)) }) as typeof fetch
  const player = new StemPlayer({ melody: '/mel.mp3', accompaniment: '/acc.mp3' }, 60, () => {}, () => context as unknown as AudioContext, fetcher)
  return { player, context, sources, gains, requests: () => requests, resumes: () => resumes }
}

test('both stems use one clock and seek offset; live gain/mute/reset never restart playback', async () => {
  const { player, context, sources, gains, requests } = harness()
  await player.play()
  assert.equal(player.state.status, 'playing')
  assert.deepEqual(sources.map(s => s.startArgs), [[10.025, 0], [10.025, 0]])
  assert.deepEqual(gains.map(g => g.gain.value), [1, 10 ** (-12 / 20)])
  context.currentTime = 15.025
  assert.equal(player.currentTime, 5)
  player.setVolume('accompaniment', -24, false)
  assert.equal(gains[1].gain.target, 10 ** (-24 / 20)); assert.equal(gains[0].gain.target, undefined)
  player.setVolume('melody', 0, true)
  assert.equal(gains[0].gain.target, 0)
  player.resetVolumes()
  assert.deepEqual(player.state.volumes, defaultVolumes)
  assert.equal(gains[0].gain.target, 1); assert.equal(gains[1].gain.target, 10 ** (-12 / 20))
  assert.equal(sources.length, 2); assert.equal(player.currentTime, 5)
  player.pause(); context.currentTime = 40
  assert.equal(player.currentTime, 5); assert.ok(sources.every(s => s.stopped))
  player.seek(30); await player.play()
  assert.deepEqual(sources.slice(2).map(s => s.startArgs), [[40.025, 30], [40.025, 30]])
  assert.equal(requests(), 2, 'pause/resume reuses decoded buffers')
  player.seek(45)
  assert.deepEqual(sources.slice(4).map(s => s.startArgs), [[40.025, 45], [40.025, 45]])
  player.seek(60)
  assert.equal(player.state.status, 'ended'); assert.ok(sources.every(s => s.stopped))
  await player.play(); assert.deepEqual(sources.slice(6).map(s => s.startArgs), [[40.025, 0], [40.025, 0]])
  sources[6].onended!(); assert.equal(player.state.status, 'ended'); assert.equal(player.currentTime, 60)
  player.release(); await player.play(); assert.equal(requests(), 4, 'switching frees the decoded recordings')
  player.dispose(); assert.ok(sources.every(s => s.stopped))
})

test('cancel/switch/dispose during a slow download cannot start stale audio; errors retry both stems', async () => {
  let responses: ((response: Response) => void)[] = []
  const h = harness((() => new Promise<Response>(resolve => responses.push(resolve))) as typeof fetch)
  const pending = h.player.play()
  assert.equal(h.player.state.status, 'loading'); assert.equal(h.resumes(), 1, 'resume starts before loading finishes')
  h.player.release()
  responses.forEach(resolve => resolve(new Response(new ArrayBuffer(8))))
  await pending
  assert.equal(h.sources.length, 0); assert.equal(h.player.state.status, 'paused')
  responses = []; const retry = h.player.play()
  responses[0](new Response('', { status: 404 })); responses[1](new Response(new ArrayBuffer(8)))
  await retry
  assert.equal(h.player.state.status, 'error'); assert.equal(h.sources.length, 0)
  responses = []; const next = h.player.play()
  responses.forEach(resolve => resolve(new Response(new ArrayBuffer(8))))
  await next; assert.equal(h.player.state.status, 'playing')
  h.player.release(); responses = []; const disposed = h.player.play(); h.player.dispose()
  responses.forEach(resolve => resolve(new Response(new ArrayBuffer(8)))); await disposed
  assert.equal(h.sources.length, 2); assert.ok(h.sources.every(s => s.stopped))
})

test('unaligned decoded stems fail together and seek while loading is honored', async () => {
  const h = harness()
  let decoded = 0
  h.context.decodeAudioData = async () => ({ duration: decoded++ === 0 ? 60 : 59 })
  await h.player.play(); assert.equal(h.player.state.status, 'error'); assert.equal(h.sources.length, 0)
  h.context.decodeAudioData = async () => ({ duration: 60 })
  const pending = h.player.play(); h.player.seek(20); await pending
  assert.deepEqual(h.sources.map(s => s.startArgs[1]), [20, 20])
  h.player.setVolume('melody', Infinity, false); assert.equal(h.player.state.volumes.melody.db, 0)
  h.player.dispose()
})

test('all 200 stem recordings are intact, time-aligned and have headroom at the maximum +6 dB setting', () => {
  for (const asset of audit.assets) {
    for (const role of ['melody', 'accompaniment'] as const) {
      assert.equal(asset.stemSources[role], `/media/evaluation/${asset.id}-${role}.mp3`)
      const bytes = readFileSync(`public${asset.stemSources[role]}`)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.stemAudio[role].sha256)
      assert.equal(asset.stemAudio[role].duration, asset.duration)
    }
    assert.ok((asset.stems.melody.peak + asset.stems.accompaniment.peak) * volumeGain({ db: 6, muted: false }) < .98)
  }
  const assignment = assignSamples(catalog as Catalog, () => 0)
  delete assignment.reference.stemSources
  for (const sample of Object.values(assignment.samples)) delete sample.stemSources
  const session = publicSession({ id: randomUUID(), dataset_version: catalog.datasetVersion, rubric_version: 'rubric', song_id: assignment.songId, assignment, created_at: new Date() }, false)
  for (const asset of [session.reference, ...session.samples]) {
    assert.equal(asset.stemSources?.melody, `/media/evaluation/${asset.id}-melody.mp3`)
    assert.equal(asset.stemSources?.accompaniment, `/media/evaluation/${asset.id}-accompaniment.mp3`)
    assert.deepEqual(Object.keys(asset.stemSources!).sort(), ['accompaniment', 'melody'])
  }
})
