import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const songs = JSON.parse(readFileSync('src/data/v2-round2-videos.json', 'utf8'))
const audit = JSON.parse(readFileSync('docs/v2-round2-videos-audit.json', 'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

test('Round 2 publishes exactly the approved 11 pairs from Chinese/Japanese, with camera audio', () => {
  assert.equal(songs.length, 8)
  assert.equal(songs.reduce((count, song) => count + song.takes.length, 0), 11)
  assert.equal(audit.audioSource, 'camera')
  assert.equal(audit.assets.length, 22)
  assert.deepEqual(songs.map(s => [s.title, s.takes.length]), [
    ['童话', 2], ['Lemon', 2], ["A Cruel Angel's Thesis", 1], ['告白气球', 2],
    ['青花瓷', 1], ['月亮代表我的心', 1], ['天空之城', 1], ['一路向北', 1],
  ])
  const files = []
  for (const song of songs) for (const take of song.takes) {
    const pair = audit.assets.filter(a => a.song === song.id && a.take === take.take)
    assert.equal(pair.length, 2)
    assert.equal(pair[0].pair, pair[1].pair)
    assert.equal(pair[0].frames, pair[1].frames)
    for (const view of ['camera', 'screen']) {
      const record = pair.find(a => a.view === view)
      assert.match(record.sourceFile, /^(Chinese|Japanese)\/[^/]+\/Take_\d+\/(camera|screen)\.mp4$/)
      assert.ok(!record.sourceFile.includes('Unmatched') && !record.sourceFile.includes('Unidentified'))
      assert.ok(Math.abs(record.frames / 30 - take.duration) < .000001)
      assert.equal(record.fps, 30)
      assert.equal(record.width, 1280)
      assert.ok(record.height <= 720)
      assert.equal(take[view].width, record.width)
      assert.equal(take[view].height, record.height)
      assert.ok(record.bytes < record.sourceBytes)
      assert.match(record.sourceSha256, /^[0-9a-f]{64}$/)
      assert.equal(record.hasAudio, view === 'camera')
      if (view === 'camera') assert.match(record.cameraAudioSha256, /^SHA256=[0-9a-f]{64}$/)
      else assert.equal(record.cameraAudioSha256, null)
      assert.equal(take[view].src, record.src)
      const mp4 = readFileSync(`public${take[view].src}`)
      const poster = readFileSync(`public${take[view].poster}`)
      assert.equal(sha(mp4), record.videoSha256)
      assert.equal(sha(poster), record.posterSha256)
      assert.equal(poster.toString('ascii', 8, 12), 'WEBP')
      files.push(take[view].src.split('/round2/')[1], take[view].poster.split('/round2/')[1])
    }
  }
  const actual = readdirSync('public/media/streammuse/v2/round2', { recursive: true }).filter(p => /\.(mp4|webp)$/.test(p)).sort()
  assert.deepEqual(actual, files.sort())
})
