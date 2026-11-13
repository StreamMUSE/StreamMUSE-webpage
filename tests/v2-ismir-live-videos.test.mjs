import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const live = JSON.parse(readFileSync('src/data/v2-ismir-live-videos.json', 'utf8'))

test('ISMIR live demos map all six supplied recordings to distinct YouTube videos', () => {
  assert.equal(new URL(live.playlistUrl).searchParams.get('list'), 'PLWtz_NmQItmo')
  assert.equal(live.videos.length, 6)
  assert.equal(new Set(live.videos.map(video => video.id)).size, 6)
  assert.equal(new Set(live.videos.map(video => video.src)).size, 6)
  assert.deepEqual(live.videos.map(video => video.sourceFilename), [
    '1916_1794504037.mp4', '1917_1794504060.mp4', '1918_1794504102.mp4',
    '1921_1794504260.mp4', '1929_1794504602.mp4', '1930_1794504612.mp4',
  ])
  for (const [index, video] of live.videos.entries()) {
    assert.equal(video.title, `Performance ${String(index + 1).padStart(2, '0')}`)
    const url = new URL(video.src)
    assert.equal(url.origin, 'https://www.youtube.com')
    assert.equal(url.pathname, '/watch')
    assert.match(url.searchParams.get('v'), /^[A-Za-z0-9_-]{11}$/)
    assert.match(video.duration, /^\d+:\d{2}$/)
  }
})
