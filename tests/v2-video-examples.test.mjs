import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const songs = JSON.parse(readFileSync('src/data/v2-video-examples.json', 'utf8'))
const midiSongs = JSON.parse(readFileSync('src/data/v2-midi-examples.json', 'utf8'))
const audit = JSON.parse(readFileSync('docs/v2-video-examples-audit.json', 'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

test('all twenty approved recordings are assigned to the correct ten melodies and take numbers', () => {
  assert.equal(audit.source, 'StreamMUSE v2')
  assert.equal(audit.assets.length, 20)
  assert.deepEqual(songs.map(({ id, title }) => ({ id, title })), midiSongs.map(({ id, title }) => ({ id, title })))
  assert.deepEqual(songs.map(song => song.takes.length), [1, 1, 1, 1, 1, 3, 3, 3, 3, 3])
  for (const song of songs) for (const [index, take] of song.takes.entries()) {
    const record = audit.assets.find(row => row.song === song.id && row.take === take.take)
    assert.equal(take.take, index + 1)
    assert.equal(take.id, `v2-video-${song.id}-${take.take}`)
    const originalTitle = record.sourceFile.split('/').pop().match(/^(.+?)\s+正式\s*(\d+)\.mp4$/)
    assert.equal(originalTitle[1].toLowerCase().replace('cruel angle', 'cruel angel'), song.title.toLowerCase())
    assert.equal(Number(originalTitle[2]), take.take)
    assert.equal(take.duration, record.duration)
    assert.ok(take.duration > 0 && record.posterTime > 0 && record.posterTime < take.duration)
    assert.ok(take.width > 0 && take.height > 0)
    assert.equal(record.videoCodec, 'h264')
    assert.equal(record.audioCodec, 'aac')
  }
})

test('published MP4s retain their original bytes and every recording has a valid WebP poster', () => {
  const files = []
  for (const song of songs) for (const take of song.takes) {
    const record = audit.assets.find(row => row.song === song.id && row.take === take.take)
    const base = `/media/streammuse/v2/videos/${song.id}/take-${take.take}`
    assert.equal(take.src, `${base}.mp4`)
    assert.equal(take.poster, `${base}.webp`)
    const video = readFileSync(`public${take.src}`)
    const poster = readFileSync(`public${take.poster}`)
    assert.equal(video.length, record.bytes)
    assert.equal(sha(video), record.videoSha256)
    assert.equal(sha(poster), record.posterSha256)
    assert.equal(poster.toString('ascii', 0, 4), 'RIFF')
    assert.equal(poster.toString('ascii', 8, 12), 'WEBP')
    files.push(`${song.id}/take-${take.take}.mp4`, `${song.id}/take-${take.take}.webp`)
  }
  const published = readdirSync('public/media/streammuse/v2/videos', { recursive: true }).filter(name => /\.(mp4|webp)$/.test(name))
  assert.equal(published.length, 40)
  assert.deepEqual(published.sort(), files.sort())
})
