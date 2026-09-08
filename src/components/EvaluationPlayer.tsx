'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Asset } from '@/lib/evaluation/model'
import { formatTime, seekTime, visibleWindow, type PianoRoll } from '@/lib/evaluation/piano-roll'
import styles from './EvaluationPlayer.module.css'

const left = 38, right = 12, top = 22, bottom = 24, height = 244
const colors = { melody: '#087d77', accompaniment: '#bc6243' }

function draw(canvas: HTMLCanvasElement, roll: PianoRoll, time: number, playing: boolean) {
  time = Math.min(time, roll.duration)
  const width = canvas.clientWidth
  if (!width) return
  const ratio = window.devicePixelRatio || 1
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#fcfdfb'; ctx.fillRect(0, 0, width, height)
  const { start, end } = visibleWindow(time, roll.duration)
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const row = plotHeight / (roll.maxPitch - roll.minPitch + 1)
  const x = (seconds: number) => left + (seconds - start) / (end - start) * plotWidth
  const y = (pitch: number) => top + (roll.maxPitch - pitch) * row
  ctx.font = '10px system-ui, sans-serif'
  for (let pitch = roll.minPitch; pitch <= roll.maxPitch; pitch++) {
    if ([1, 3, 6, 8, 10].includes(pitch % 12)) {
      ctx.fillStyle = '#f0f3ef'; ctx.fillRect(left, y(pitch), plotWidth, row)
    }
    if (pitch % 12 === 0) {
      ctx.strokeStyle = '#dce5df'; ctx.beginPath(); ctx.moveTo(left, y(pitch) + row); ctx.lineTo(width - right, y(pitch) + row); ctx.stroke()
      ctx.fillStyle = '#62706a'; ctx.fillText(`C${Math.floor(pitch / 12) - 1}`, 8, y(pitch) + row + 3)
    }
  }
  ctx.textAlign = 'center'
  for (let second = Math.ceil(start / 2) * 2; second <= end; second += 2) {
    ctx.strokeStyle = '#e0e7e1'; ctx.beginPath(); ctx.moveTo(x(second), top); ctx.lineTo(x(second), height - bottom); ctx.stroke()
    ctx.fillStyle = '#62706a'; ctx.fillText(formatTime(second), Math.min(width - 19, x(second)), height - 8)
  }
  // Accompaniment first keeps the melody visible where the two roles overlap.
  for (const role of ['accompaniment', 'melody'] as const) for (const note of roll.notes) {
    if (note.role !== role || note.time + note.duration <= start || note.time >= end) continue
    const active = playing && time >= note.time && time < note.time + note.duration
    const noteX = x(Math.max(start, note.time)), noteY = y(note.pitch) + .4
    const noteWidth = Math.max(1.5, x(Math.min(end, note.time + note.duration)) - noteX)
    const noteHeight = Math.max(2, row - .8)
    ctx.fillStyle = colors[role]; ctx.globalAlpha = active ? 1 : .68 + note.velocity * .25
    ctx.fillRect(noteX, noteY, noteWidth, noteHeight)
    if (active) { ctx.strokeStyle = '#173c37'; ctx.lineWidth = 1.5; ctx.strokeRect(noteX, noteY, noteWidth, noteHeight) }
  }
  ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.strokeStyle = '#183f39'
  ctx.beginPath(); ctx.moveTo(x(time), top - 7); ctx.lineTo(x(time), height - bottom); ctx.stroke()
  ctx.fillStyle = '#183f39'; ctx.beginPath(); ctx.moveTo(x(time) - 4, top - 9); ctx.lineTo(x(time) + 4, top - 9); ctx.lineTo(x(time), top - 3); ctx.fill()
  ctx.lineWidth = 1; ctx.textAlign = 'left'
}

export default function EvaluationPlayer({ label, asset, onPlay }: {
  label: string; asset: Asset; onPlay: (audio: HTMLAudioElement) => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const hintId = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [roll, setRoll] = useState<PianoRoll | null>(null)
  const [rollError, setRollError] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [played, setPlayed] = useState(false)
  const [ended, setEnded] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(asset.duration)
  const [reload, setReload] = useState(0)
  const visualizationSrc = asset.visualizationSrc ?? `/media/evaluation/${asset.id}.json`
  useEffect(() => {
    const controller = new AbortController()
    setRoll(null); setRollError(false)
    void fetch(visualizationSrc, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Visualization unavailable')
      const data = await response.json() as PianoRoll
      if (data.schemaVersion !== 1 || !Array.isArray(data.notes) || !(data.duration > 0) || data.maxPitch < data.minPitch) throw new Error('Invalid visualization')
      if (!controller.signal.aborted) setRoll(data)
    }).catch(() => { if (!controller.signal.aborted) setRollError(true) })
    return () => controller.abort()
  }, [visualizationSrc, reload])

  useEffect(() => {
    const audio = audioRef.current, canvas = canvasRef.current
    if (!audio || !canvas || !roll) return
    let frame = 0
    const paint = () => draw(canvas, roll, audio.currentTime, !audio.paused && !audio.ended)
    const tick = () => { paint(); frame = requestAnimationFrame(tick) }
    const start = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(tick) }
    const stop = () => { cancelAnimationFrame(frame); paint() }
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    audio.addEventListener('play', start); audio.addEventListener('pause', stop); audio.addEventListener('ended', stop)
    audio.addEventListener('seeked', paint); audio.addEventListener('timeupdate', paint)
    audio.addEventListener('loadedmetadata', paint)
    paint(); if (!audio.paused) start()
    return () => {
      cancelAnimationFrame(frame); observer.disconnect()
      audio.removeEventListener('play', start); audio.removeEventListener('pause', stop); audio.removeEventListener('ended', stop)
      audio.removeEventListener('seeked', paint); audio.removeEventListener('timeupdate', paint); audio.removeEventListener('loadedmetadata', paint)
    }
  }, [roll])

  const seek = useCallback((next: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.max(0, Math.min(next, audio.duration))
    setTime(audio.currentTime); setEnded(false)
  }, [])

  return (
    <div className={styles.player}>
      <div className={styles.visual}>
        <div className={styles.legend}>
          <span><i className={styles.melody} />Melody</span><span><i className={styles.accompaniment} />Accompaniment</span>
          <span className={styles.clock}>{formatTime(time)} / {formatTime(duration)}</span>
        </div>
        {roll ? <canvas ref={canvasRef} className={styles.roll} role="slider" tabIndex={0}
          aria-label={`${label} piano roll, playback position`} aria-valuemin={0} aria-valuemax={Math.ceil(duration)}
          aria-valuenow={Math.floor(time)} aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
          aria-describedby={hintId}
          onPointerDown={event => {
            const rect = event.currentTarget.getBoundingClientRect()
            const window = visibleWindow(audioRef.current?.currentTime ?? 0, roll.duration)
            seek(seekTime((event.clientX - rect.left - left) / (rect.width - left - right), window.start, window.end, duration))
            event.currentTarget.focus()
          }}
          onKeyDown={event => {
            const current = audioRef.current?.currentTime ?? 0
            const next = { ArrowLeft: current - 5, ArrowRight: current + 5, ArrowDown: current - 5, ArrowUp: current + 5, Home: 0, End: duration }[event.key]
            if (next !== undefined) { event.preventDefault(); seek(next) }
          }} /> : <div className={styles.placeholder} role="status">{rollError ? <>The note view could not load. You can still listen.<button type="button" onClick={() => setReload(value => value + 1)}>Retry note view</button></> : 'Loading notes…'}</div>}
        <p id={hintId} className={styles.hint}>Pitch ↑ · Time → · Click notes to seek · Arrow keys move 5s · Home/End jump to start/end</p>
      </div>
      <audio ref={audioRef} aria-label={label} controls preload="metadata" src={asset.src}
        onPlay={event => { onPlay(event.currentTarget); setPlayed(true); setEnded(false) }}
        onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onEnded={() => setEnded(true)}
        onDurationChange={event => { if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration) }}
        onError={() => setAudioError(true)} onLoadedMetadata={() => setAudioError(false)} />
      <span className={styles.status}>{audioError ? 'Audio could not load. Check your connection and reload the audio.' : ended ? 'Reached the end · Replay anytime' : played ? 'Listening started · Replay or seek anytime' : 'Ready to listen · Replay or seek anytime'}</span>
      {audioError ? <button className={styles.retry} type="button" onClick={() => audioRef.current?.load()}>Reload audio</button> : null}
    </div>
  )
}
