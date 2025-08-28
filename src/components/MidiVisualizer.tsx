'use client'

import { useEffect, useRef, useState } from 'react'
import type { MidiNote } from '@/types'

interface MidiVisualizerProps {
  notes: MidiNote[]
  duration: number
  isPlaying: boolean
}

export default function MidiVisualizer({ notes = [], duration, isPlaying }: MidiVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentTime, setCurrentTime] = useState(0)

  // 播放进度控制 (逻辑不变)
  useEffect(() => {
    let animationFrameId: number;
    if (isPlaying) {
      const startTime = performance.now();
      const tick = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        setCurrentTime(elapsed % duration);
        animationFrameId = requestAnimationFrame(tick);
      };
      tick();
    } else {
      setCurrentTime(0);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, duration]);

  // 绘图逻辑
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || notes.length === 0 || duration <= 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // --- 优化的音高范围计算 ---
    const pitches = notes.map(n => n.pitch);
    let minPitch = Math.min(...pitches);
    let maxPitch = Math.max(...pitches);
    
    // 防止音域过窄导致图像被过度拉伸
    if (maxPitch - minPitch < 24) { // 如果音域跨度小于2个八度
      const midPitch = (minPitch + maxPitch) / 2;
      minPitch = midPitch - 12;
      maxPitch = midPitch + 12;
    }

    const pitchRange = maxPitch - minPitch + 1;
    const pixelsPerSecond = width / duration;
    const pixelsPerPitch = height / pitchRange;

    // 绘制音符
    notes.forEach(note => {
      const x = note.start * pixelsPerSecond;
      const y = (maxPitch - note.pitch) * pixelsPerPitch;
      const w = Math.max(1, note.duration * pixelsPerSecond); // 确保音符至少有1像素宽
      const h = Math.max(2, pixelsPerPitch * 0.9); // 给予音符一些厚度

      const hue = ((note.pitch - minPitch) / pitchRange) * 240
      ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${note.velocity / 127})`
      ctx.fillRect(x, y, w, h)
    })

    // 绘制播放线
    if (isPlaying) {
      const progressX = currentTime * pixelsPerSecond
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, height)
      ctx.stroke()
    }
  }, [notes, duration, currentTime, isPlaying])

  if (notes.length === 0) {
    return <div className="h-full flex items-center justify-center text-xs text-gray-500">无音符信息</div>
  }

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} width={400} height={100} className="w-full h-full" />
    </div>
  )
}