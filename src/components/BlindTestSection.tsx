'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import MidiVisualizer from './MidiVisualizer'
import { getGlobalMidiPlayer, playDemoMidi } from '@/lib/midiPlayer'
import type { AudioMetadata } from '@/types'

export default function BlindTestSection() {
  const [currentPair, setCurrentPair] = useState<[AudioMetadata, AudioMetadata] | null>(null)
  const [isPlayingA, setIsPlayingA] = useState(false)
  const [isPlayingB, setIsPlayingB] = useState(false)
  const [isLoadingA, setIsLoadingA] = useState(false)
  const [isLoadingB, setIsLoadingB] = useState(false)
  const [votesCount, setVotesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const playerRef = useRef(getGlobalMidiPlayer())

  // 模拟数据 - 实际应用中从API获取
  const sampleAudio: AudioMetadata = {
    id: 'sample_a',
    filename: 'xinyue_new_025b_sample.mid',
    metadata: {
      model_architecture: 'xinyue_new',
      model_parameters: '0.25b',
      training_dataset: 'aria_unique',
      prompt_length: '75t',
      generation_length: '100t', 
      inference_mode: 'real_time'
    },
    audio_info: {
      duration: 30,
      file_size: '45KB',
      format: 'midi'
    },
    generation_params: {
      temperature: 0.8,
      top_p: 0.9,
      seed: 42
    },
    evaluation: {
      votes: 0,
      elo_rating: 1500,
      total_comparisons: 0
    },
    created_at: new Date().toISOString()
  }

  const sampleAudioB: AudioMetadata = {
    ...sampleAudio,
    id: 'sample_b',
    metadata: {
      ...sampleAudio.metadata,
      model_architecture: 'xinyue_old',
      model_parameters: '0.12b'
    }
  }

  useEffect(() => {
    // 模拟加载新的对比对
    setTimeout(() => {
      setCurrentPair([sampleAudio, sampleAudioB])
      setLoading(false)
    }, 1000)
  }, [])

  const handleVote = async (choice: 'a' | 'b' | 'skip') => {
    // 停止所有播放
    playerRef.current.stop()
    setIsPlayingA(false)
    setIsPlayingB(false)
    
    // 处理投票逻辑
    setVotesCount(prev => prev + 1)
    
    // 发送投票数据到API
    if (currentPair && choice !== 'skip') {
      try {
        await fetch('/api/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_a_id: currentPair[0].id,
            audio_b_id: currentPair[1].id,
            winner: choice,
            comparison_type: 'blind_test'
          })
        })
      } catch (error) {
        console.error('Failed to submit vote:', error)
      }
    }
    
    // 加载下一对
    loadNextPair()
  }

  const loadNextPair = () => {
    setLoading(true)
    setIsPlayingA(false)
    setIsPlayingB(false)
    setIsLoadingA(false)
    setIsLoadingB(false)
    playerRef.current.stop()
    
    // 模拟加载
    setTimeout(() => {
      setCurrentPair([sampleAudioB, sampleAudio]) // 模拟新的对比
      setLoading(false)
    }, 500)
  }

  const togglePlayA = async () => {
    const player = playerRef.current
    
    try {
      if (isPlayingA) {
        // 暂停播放A
        player.stop()
        setIsPlayingA(false)
      } else {
        // 停止B的播放
        if (isPlayingB) {
          setIsPlayingB(false)
        }
        
        // 开始播放A
        setIsLoadingA(true)
        player.stop() // 确保停止之前的播放
        
        await playDemoMidi() // 播放示例音乐
        setIsPlayingA(true)
      }
    } catch (error) {
      console.error('Play A error:', error)
      alert('播放失败，请检查浏览器是否支持音频播放')
    } finally {
      setIsLoadingA(false)
    }
  }

  const togglePlayB = async () => {
    const player = playerRef.current
    
    try {
      if (isPlayingB) {
        // 暂停播放B
        player.stop()
        setIsPlayingB(false)
      } else {
        // 停止A的播放
        if (isPlayingA) {
          setIsPlayingA(false)
        }
        
        // 开始播放B
        setIsLoadingB(true)
        player.stop() // 确保停止之前的播放
        
        await playDemoMidi() // 播放示例音乐
        setIsPlayingB(true)
      }
    } catch (error) {
      console.error('Play B error:', error)
      alert('播放失败，请检查浏览器是否支持音频播放')
    } finally {
      setIsLoadingB(false)
    }
  }

  // 清理资源
  useEffect(() => {
    return () => {
      playerRef.current.stop()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 统计信息 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
          <span className="font-semibold">已评测: {votesCount} 对</span>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="text-center mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          💡 <strong>提示:</strong> 点击播放按钮试听音频，然后选择你认为更好的版本。
          由于这是演示版本，目前播放的是示例音乐。
        </p>
      </div>

      {/* 对比区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* 音频 A */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">音频 A</h3>
            <button
              onClick={togglePlayA}
              disabled={isLoadingA}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                isLoadingA
                  ? 'bg-gray-400 text-white cursor-wait'
                  : isPlayingA 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isLoadingA ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : isPlayingA ? (
                <Pause className="w-5 h-5 mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {isLoadingA ? '加载中' : isPlayingA ? '暂停' : '播放'}
            </button>
          </div>
          <MidiVisualizer 
            audioMetadata={currentPair?.[0] || sampleAudio} 
            isPlaying={isPlayingA}
          />
        </div>

        {/* 音频 B */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">音频 B</h3>
            <button
              onClick={togglePlayB}
              disabled={isLoadingB}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                isLoadingB
                  ? 'bg-gray-400 text-white cursor-wait'
                  : isPlayingB 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isLoadingB ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : isPlayingB ? (
                <Pause className="w-5 h-5 mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {isLoadingB ? '加载中' : isPlayingB ? '暂停' : '播放'}
            </button>
          </div>
          <MidiVisualizer 
            audioMetadata={currentPair?.[1] || sampleAudioB} 
            isPlaying={isPlayingB}
          />
        </div>
      </div>

      {/* 投票按钮 */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => handleVote('a')}
          className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          A 更好 👍
        </button>
        <button
          onClick={() => handleVote('b')}
          className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          B 更好 👍
        </button>
        <button
          onClick={() => handleVote('skip')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          跳过 ⏭️
        </button>
        <button
          onClick={loadNextPair}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          title="重新加载对比"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
