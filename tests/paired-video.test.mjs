import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync('src/lib/paired-video.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText
const { PairedVideoPlayback } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
let frame = 0
globalThis.requestAnimationFrame = () => ++frame
globalThis.cancelAnimationFrame = () => {}
const settled = () => new Promise(resolve => setImmediate(resolve))

class Video extends EventTarget {
  src = ''; currentTime = 0; duration = 90; readyState = 4; seeking = false
  volume = .8; muted = false; paused = true; playbackRate = 1; error = null
  result = () => Promise.resolve()
  play() { this.paused = false; return this.result() }
  pause() { this.paused = true; this.emit('pause') }
  load() { if (this.src) this.emit('loadedmetadata') }
  removeAttribute() { this.src = '' }
  emit(event) { this.dispatchEvent(new Event(event)) }
}
function setup() {
  const camera = new Video(), screen = new Video(), states = []
  const player = new PairedVideoPlayback(camera, screen, { camera: '/camera.mp4', screen: '/screen.mp4' }, 90,
    state => states.push(state), () => {}, () => {})
  return { camera, screen, states, player }
}

test('pair loads on demand, uses only camera sound, and pauses together for another player', async () => {
  const { camera, screen, states, player } = setup()
  player.pause() // An unrelated player starts while this card has never loaded.
  assert.deepEqual(states, [])
  assert.equal(camera.src, '')
  player.play(); await settled()
  assert.equal(states.at(-1), 'playing')
  assert.equal(camera.muted, false); assert.equal(camera.volume, .8)
  screen.muted = false; screen.volume = 1; screen.emit('volumechange')
  assert.equal(screen.muted, true); assert.equal(screen.volume, 0)
  camera.pause()
  assert.equal(screen.paused, true)
  assert.equal(states.at(-1), 'paused')
  player.dispose()
})

test('a buffering view holds both videos, resumes together, and respects pause during buffering', async () => {
  const { camera, screen, states, player } = setup()
  player.play(); await settled()
  screen.readyState = 2; screen.emit('waiting')
  assert.ok(camera.paused && screen.paused)
  assert.equal(states.at(-1), 'loading')
  screen.readyState = 4; screen.emit('canplay'); await settled()
  assert.ok(!camera.paused && !screen.paused)
  screen.readyState = 2; screen.emit('waiting'); player.pause()
  screen.readyState = 4; screen.emit('canplay'); await settled()
  assert.ok(camera.paused && screen.paused)
  assert.equal(states.at(-1), 'paused')
  player.dispose()
})

test('seeking keeps both views aligned, and late play promises cannot restart an unmounted take', async () => {
  const { camera, screen, states, player } = setup()
  player.play(); await settled(); player.pause(); player.seek(42)
  assert.equal(camera.currentTime, 42); assert.equal(screen.currentTime, 42)
  assert.ok(camera.paused && screen.paused)
  let resolvePlay
  camera.result = () => new Promise(resolve => { resolvePlay = resolve })
  player.play(); player.dispose()
  const count = states.length
  resolvePlay(); await settled()
  assert.equal(states.length, count)
  assert.ok(camera.paused && screen.paused)
  assert.equal(camera.src, ''); assert.equal(screen.src, '')
})

test('a failed view stops the pair and a retry can recover', async () => {
  const { camera, screen, states, player } = setup()
  screen.result = () => Promise.reject(new Error('Network failure'))
  player.play(); await settled()
  assert.equal(states.at(-1), 'error')
  assert.ok(camera.paused && screen.paused)
  screen.result = () => Promise.resolve()
  player.play(); await settled()
  assert.equal(states.at(-1), 'playing')
  player.dispose()
})
