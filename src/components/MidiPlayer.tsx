'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2, Pause, Play, RotateCcw } from 'lucide-react'
import { Midi } from '@tonejs/midi'
import * as Tone from 'tone'
import type { MidiItem } from '@/types/project'

interface MidiPlayerProps {
  item: MidiItem
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'error'

let stopActivePlayback: (() => void) | null = null

export default function MidiPlayer({ item }: MidiPlayerProps) {
  const [state, setState] = useState<PlayerState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const eventIdsRef = useRef<number[]>([])
  const endTimerRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    eventIdsRef.current.forEach((id) => Tone.getTransport().clear(id))
    eventIdsRef.current = []

    if (endTimerRef.current) {
      window.clearTimeout(endTimerRef.current)
      endTimerRef.current = null
    }

    const transport = Tone.getTransport()
    transport.stop()
    transport.position = 0
    synthRef.current?.releaseAll()
    setState('idle')

    if (stopActivePlayback === stop) {
      stopActivePlayback = null
    }
  }, [])

  useEffect(() => stop, [stop])

  const play = async () => {
    if (state === 'playing') {
      stop()
      return
    }

    setState('loading')
    setErrorMessage('')

    try {
      stopActivePlayback?.()
      await Tone.start()

      if (!synthRef.current) {
        synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination()
      }

      const midi = await Midi.fromUrl(item.src)
      const transport = Tone.getTransport()
      transport.stop()
      transport.cancel(0)
      transport.position = 0

      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          const eventId = transport.scheduleOnce((time) => {
            synthRef.current?.triggerAttackRelease(note.name, note.duration, time, note.velocity)
          }, note.time)
          eventIdsRef.current.push(eventId)
        })
      })

      stopActivePlayback = stop
      setState('playing')
      transport.start('+0.05')
      endTimerRef.current = window.setTimeout(stop, Math.ceil((midi.duration + 0.2) * 1000))
    } catch (error) {
      console.error('MIDI playback failed:', error)
      setErrorMessage('MIDI playback failed. Check that the file exists and is valid.')
      setState('error')
    }
  }

  const isLoading = state === 'loading'
  const isPlaying = state === 'playing'

  return (
    <div className="midi-player">
      <div className="midi-player-main">
        <button className="icon-button" type="button" onClick={play} disabled={isLoading} aria-label={`${isPlaying ? 'Stop' : 'Play'} ${item.title}`}>
          {isLoading ? <Loader2 size={18} className="spin" aria-hidden="true" /> : isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <button className="icon-button secondary" type="button" onClick={stop} aria-label={`Reset ${item.title}`}>
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <div>
          <h4>{item.title}</h4>
          {item.caption ? <p>{item.caption}</p> : null}
          <div className="midi-meta">
            {item.duration ? <span>{item.duration}</span> : null}
            {item.scenario ? <span>{item.scenario}</span> : null}
          </div>
        </div>
      </div>
      <a className="download-link" href={item.src} download={item.downloadName}>
        <Download size={16} aria-hidden="true" />
        Download
      </a>
      {errorMessage ? <p className="midi-error">{errorMessage}</p> : null}
    </div>
  )
}
