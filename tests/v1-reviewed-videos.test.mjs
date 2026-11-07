import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const recordings = JSON.parse(readFileSync('src/data/v1-single-videos.json', 'utf8'))
const audit = JSON.parse(readFileSync('docs/v1-reviewed-videos-audit.json', 'utf8'))
const digest = data => createHash('sha256').update(data).digest('hex')

test('reviewed v1 clips cover accepted sources without publishing debug/stalled recordings or fabricated pairs', () => {
  assert.equal(audit.reviewedUnmatchedSources, 18)
  assert.equal(audit.originalsUnchanged, true)
  assert.equal(audit.allOriginalsDecodeOk, true)
  assert.equal(audit.newPairsConfirmed, 0)
  assert.equal(recordings.length, 16)
  assert.equal(recordings.filter(recording => recording.view === 'camera').length, 11)
  assert.equal(recordings.filter(recording => recording.view === 'screen').length, 5)
  assert.deepEqual(audit.excluded.map(item => item.sourceId).sort(), ['P02', 'P13', 'P15'])
  assert.equal(new Set(audit.assets.map(asset => asset.sourceId)).size, 15)
  const attempts = audit.assets.filter(asset => asset.sourceId === 'P07')
  assert.equal(attempts.length, 2)
  assert.ok(attempts[0].end < attempts[1].start)
  assert.ok(attempts[0].end < 46 && attempts[1].start > 100)
  assert.ok(attempts[0].start >= 17 && attempts[1].start >= 102.8)
  assert.ok(audit.assets.find(asset => asset.sourceId === 'P01').start >= 13.2)
  assert.ok(audit.assets.find(asset => asset.sourceId === 'P09').start >= 59.8)
  assert.ok(audit.assets.find(asset => asset.sourceId === 'P11').start >= 45.6)
  assert.ok(!audit.assets.some(asset => ['P02', 'P13', 'P15'].includes(asset.sourceId)))
  for (const recording of recordings) {
    assert.equal('camera' in recording, false)
    assert.equal('screen' in recording, false)
  }
})

test('website derivatives match their audited files, preserve timing and stay within the storage budget', () => {
  const files = []
  let bytes = 0
  for (const [index, recording] of recordings.entries()) {
    const asset = audit.assets.find(item => item.id === recording.id)
    assert.ok(asset)
    assert.equal(recording.title, `Performance ${String(index + 3).padStart(2, '0')}`)
    assert.equal(recording.src, asset.src)
    assert.equal(recording.poster, asset.poster)
    assert.equal(recording.width, asset.web.width)
    assert.equal(recording.height, asset.web.height)
    assert.ok(recording.height <= 720 && recording.height <= asset.sourceHeight)
    assert.ok(recording.width <= asset.sourceWidth)
    assert.ok(Math.abs(recording.width / recording.height - asset.sourceWidth / asset.sourceHeight) < .003)
    assert.equal(asset.master.width, asset.sourceWidth)
    assert.equal(asset.master.height, asset.sourceHeight)
    assert.equal(asset.master.fps, asset.sourceFps)
    assert.equal(asset.web.fps, asset.sourceFps)
    assert.ok(Math.abs(asset.master.frames - asset.web.frames) <= (asset.masterVideoCopied ? 8 : 0))
    assert.ok(Math.abs(asset.web.frames / asset.sourceFps - (asset.end - asset.start)) < .00001)
    assert.equal(asset.master.fullDecodeOk, true)
    assert.equal(asset.web.fullDecodeOk, true)
    assert.ok(asset.webAudioGainDb <= 0)
    const video = readFileSync(`public${recording.src}`)
    const poster = readFileSync(`public${recording.poster}`)
    assert.equal(digest(video), asset.web.sha256)
    assert.equal(digest(poster), asset.posterSha256)
    assert.equal(poster[0], 0xff)
    assert.equal(poster[1], 0xd8)
    assert.ok(video.indexOf('moov') < video.indexOf('mdat'), 'MP4 must support fast start')
    bytes += video.length
    files.push(recording.src.split('/single-view/')[1], recording.poster.split('/single-view/')[1])
  }
  assert.ok(bytes < 80_000_000, 'Keep website additions below 80 MB; masters belong outside Git')
  assert.deepEqual(readdirSync('public/media/streammuse/v1/single-view').sort(), files.sort())
})
