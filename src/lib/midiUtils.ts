import { Midi } from '@tonejs/midi'
import type { MidiNote, MidiTrack } from '@/types'

export class MidiProcessor {
  /**
   * 解析 MIDI 文件并提取音符信息
   */
  static async parseMidiFile(file: ArrayBuffer): Promise<MidiTrack[]> {
    try {
      const midi = new Midi(file)
      const tracks: MidiTrack[] = []
      
      midi.tracks.forEach((track, index) => {
        const notes: MidiNote[] = track.notes.map(note => ({
          pitch: note.midi,
          start: note.time,
          duration: note.duration,
          velocity: Math.round(note.velocity * 127),
          channel: track.channel || 0
        }))
        
        tracks.push({
          name: track.name || `Track ${index + 1}`,
          notes,
          instrument: track.instrument?.number || 0
        })
      })
      
      return tracks
    } catch (error) {
      console.error('Error parsing MIDI file:', error)
      throw new Error('Failed to parse MIDI file')
    }
  }

  /**
   * 从 URL 加载 MIDI 文件
   */
  static async loadMidiFromUrl(url: string): Promise<MidiTrack[]> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch MIDI file: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return this.parseMidiFile(arrayBuffer)
    } catch (error) {
      console.error('Error loading MIDI from URL:', error)
      throw error
    }
  }

  /**
   * 获取 MIDI 文件的基本信息
   */
  static getMidiInfo(tracks: MidiTrack[]) {
    const allNotes = tracks.flatMap(track => track.notes)
    
    if (allNotes.length === 0) {
      return {
        duration: 0,
        noteCount: 0,
        pitchRange: [60, 72],
        trackCount: tracks.length
      }
    }
    
    const maxEndTime = Math.max(...allNotes.map(note => note.start + note.duration))
    const pitches = allNotes.map(note => note.pitch)
    
    return {
      duration: maxEndTime,
      noteCount: allNotes.length,
      pitchRange: [Math.min(...pitches), Math.max(...pitches)],
      trackCount: tracks.length
    }
  }

  /**
   * 过滤指定时间范围内的音符
   */
  static getNotesInTimeRange(tracks: MidiTrack[], startTime: number, endTime: number): MidiNote[] {
    return tracks.flatMap(track => 
      track.notes.filter(note => 
        note.start < endTime && (note.start + note.duration) > startTime
      )
    )
  }

  /**
   * 生成示例 MIDI 数据（用于演示）
   */
  static generateSampleMidi(duration: number = 30): MidiTrack[] {
    const notes: MidiNote[] = []
    const scales = [60, 62, 64, 65, 67, 69, 71, 72] // C 大调音阶
    
    // 生成主旋律
    for (let i = 0; i < duration * 2; i++) {
      const start = (i * 0.5) + Math.random() * 0.2
      if (start >= duration) break
      
      notes.push({
        pitch: scales[Math.floor(Math.random() * scales.length)] + Math.floor(Math.random() * 12),
        start,
        duration: 0.3 + Math.random() * 0.7,
        velocity: 70 + Math.random() * 40,
        channel: 0
      })
    }
    
    // 生成和弦伴奏
    const chordNotes: MidiNote[] = []
    for (let i = 0; i < duration / 2; i++) {
      const start = i * 2
      const root = scales[Math.floor(Math.random() * scales.length)]
      
      // 三和弦
      [0, 4, 7].forEach(interval => {
        chordNotes.push({
          pitch: root + interval,
          start,
          duration: 1.8,
          velocity: 50 + Math.random() * 20,
          channel: 1
        })
      })
    }
    
    return [
      {
        name: 'Melody',
        notes: notes.sort((a, b) => a.start - b.start),
        instrument: 1 // Piano
      },
      {
        name: 'Chords', 
        notes: chordNotes.sort((a, b) => a.start - b.start),
        instrument: 1 // Piano
      }
    ]
  }
}

/**
 * 音符名称转换工具
 */
export class NoteUtils {
  static readonly NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  
  /**
   * MIDI 音符号转音符名称
   */
  static midiToNoteName(midi: number): string {
    const octave = Math.floor(midi / 12) - 1
    const noteIndex = midi % 12
    return `${this.NOTE_NAMES[noteIndex]}${octave}`
  }
  
  /**
   * 获取音符的频率
   */
  static midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12)
  }
  
  /**
   * 判断是否为黑键
   */
  static isBlackKey(midi: number): boolean {
    const noteIndex = midi % 12
    return [1, 3, 6, 8, 10].includes(noteIndex)
  }
}

/**
 * 颜色工具，用于音符可视化
 */
export class ColorUtils {
  /**
   * 根据音高生成颜色
   */
  static getColorForPitch(pitch: number, minPitch: number, maxPitch: number): string {
    const range = maxPitch - minPitch
    const normalized = range > 0 ? (pitch - minPitch) / range : 0
    const hue = normalized * 240 // 0-240度，从红到蓝
    return `hsl(${hue}, 70%, 60%)`
  }
  
  /**
   * 根据力度生成透明度
   */
  static getAlphaForVelocity(velocity: number): number {
    return (velocity / 127) * 0.8 + 0.2 // 0.2-1.0
  }
  
  /**
   * 根据乐器生成颜色
   */
  static getColorForInstrument(instrument: number): string {
    const colors = [
      '#3B82F6', // Piano - Blue
      '#EF4444', // Guitar - Red  
      '#10B981', // Bass - Green
      '#F59E0B', // Drums - Orange
      '#8B5CF6', // Strings - Purple
      '#EC4899', // Brass - Pink
      '#06B6D4', // Woodwinds - Cyan
      '#84CC16'  // Percussion - Lime
    ]
    return colors[instrument % colors.length]
  }
}
