import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const recordings = JSON.parse(readFileSync('src/data/v1-video-examples.json', 'utf8'))
const hashes = [
  ['4bc4be6de4afba02c4d22f5cbb5b3de285a7a478fbc867379541628bebb4e2c1', 'ecb4eddce5fe803f4e2d02940e2082b21076dd29083bccb82cbabc0ee992aabb'],
  ['de6c485c023334b38c4678a0e3b3d03f51040417c4ca1db4bde0f1253428715f', 'c88dee3b091dfb17e966ddc59d1acd7a1c4c52a79296a3a5c40ce153ea49c26e'],
]

test('v1 publishes only the two verified pairs without changing their prepared video bytes', () => {
  assert.equal(recordings.length, 2)
  assert.deepEqual(recordings.map(recording => recording.title), ['Performance 01', 'Performance 02'])
  let bytes = 0
  const files = []
  for (const [index, recording] of recordings.entries()) {
    assert.ok(Math.abs(recording.duration * 30 - [1774, 1636][index]) < 0.00001)
    for (const [viewIndex, view] of ['camera', 'screen'].entries()) {
      const asset = recording[view]
      const video = readFileSync(`public${asset.src}`)
      assert.equal(createHash('sha256').update(video).digest('hex'), hashes[index][viewIndex])
      assert.equal(asset.height, 720)
      assert.equal(asset.width, view === 'camera' ? 1280 : [1108, 1130][index])
      const poster = readFileSync(`public${asset.poster}`)
      assert.equal(poster[0], 0xff)
      assert.equal(poster[1], 0xd8)
      files.push(asset.src.split('/performances/')[1], asset.poster.split('/performances/')[1])
      bytes += video.length
    }
  }
  assert.equal(bytes, 24310797)
  assert.deepEqual(readdirSync('public/media/streammuse/v1/performances', { recursive: true }).filter(path => /\.(mp4|jpg)$/.test(path)).sort(), files.sort())
})
