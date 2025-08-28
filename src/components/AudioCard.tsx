'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Play, Pause, Download, Info, Star } from 'lucide-react'
import { Midi } from '@tonejs/midi'
import { getGlobalMidiPlayer } from '@/lib/midiPlayer'
import MidiVisualizer from './MidiVisualizer'
import type { AudioCardGroup, MidiNote } from '@/types'

interface AudioCardProps {
  group: AudioCardGroup
}

export default function AudioCard({ group }: AudioCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const playerRef = useRef(getGlobalMidiPlayer())

  // 管理用户选择的 version 和 temperature
  const [selectedVersion, setSelectedVersion] = useState(group.availableVersions[0]);
  const [selectedTemp, setSelectedTemp] = useState(group.availableTemperatures[0]);

  // 存储从MIDI文件解析出的真实数据
  const [parsedMidi, setParsedMidi] = useState<Midi | null>(null);
  const [midiNotes, setMidiNotes] = useState<MidiNote[]>([]);
  const [trueDuration, setTrueDuration] = useState(30);

  // --- 核心逻辑：根据用户的选择，动态计算出当前应该播放/显示的音频实例 ---
  const currentAudio = useMemo(() => {
    // 寻找完全匹配 version 和 temperature 的那个实例
    return group.instances.find(inst => 
      inst.version === selectedVersion && 
      inst.generation_params.temperature === selectedTemp
    );
  }, [group.instances, selectedVersion, selectedTemp]);

  const togglePlay = async () => {
    const player = playerRef.current;
    
    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
    } else if (parsedMidi) { // 关键：检查我们是否已经成功解析了MIDI数据
      setIsLoading(true);
      // 直接将已经加载好的 parsedMidi 对象传递给播放器
      await player.play(parsedMidi); 
      setIsPlaying(true);
      setIsLoading(false);
    } else {
      console.warn('MIDI data not loaded yet, cannot play.');
      alert('音频数据正在加载中，请稍后再试。');
    }
  }

  // --- 在组件加载时获取并解析MIDI数据 ---
  // --- 数据加载 Effect：依赖于 currentAudio 的变化 ---
  useEffect(() => {
    // 停止当前播放的音乐，因为选择变了
    playerRef.current.stop();
    setIsPlaying(false);
    
    const loadMidiData = async () => {
      // 在加载新数据前，清空旧数据
      setParsedMidi(null);
      setMidiNotes([]);

      if (!currentAudio?.midi_url) return;
      
      setIsLoading(true);
      try {
        const midi = await Midi.fromUrl(currentAudio.midi_url);
        setParsedMidi(midi);
        setTrueDuration(midi.duration);
        const notes: MidiNote[] = [];
        midi.tracks.forEach(track => {
          track.notes.forEach(note => {
            notes.push({
              pitch: note.midi, start: note.time, duration: note.duration,
              velocity: note.velocity * 127, channel: track.channel,
            });
          });
        });
        setMidiNotes(notes);
      } catch (error) {
        console.error(`Failed to load MIDI data for ${currentAudio.filename}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMidiData();
  }, [currentAudio]); // 当用户选择变化导致 currentAudio 变化时，重新加载数据

  const handleDownload = () => {
    // --- 新增：在函数开头先检查 currentAudio 是否存在 ---
    if (!currentAudio) {
      alert('当前选择的音频实例不存在，无法下载。');
      return; // 提前退出函数
    }

    if (currentAudio.midi_url) {
      const link = document.createElement('a');
      link.href = currentAudio.midi_url;
      link.download = currentAudio.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.log('No download URL available for:', currentAudio.filename);
      alert('下载功能暂不可用');
    }
  };

  const getModelDisplayName = (model: string) => {
    const names = {
      'xinyue_old': "Xinyue's Old",
      'xinyue_new': "Xinyue's New", 
      'xinyue_new_chord': "Xinyue's New+Chord"
    }
    return names[model as keyof typeof names] || model
  }

  const getDatasetDisplayName = (dataset: string) => {
    const names = {
      'pop909': 'POP909',
      'aria_unique': 'ARIA-Unique',
      'aria_deduped': 'ARIA-Deduped'
    }
    return names[dataset as keyof typeof names] || dataset
  }

  const getModeDisplayName = (mode: string) => {
    const names = {
      'offline': 'Offline',
      'real_time': 'Real-time',
      'simulator': 'Simulator',
      'fake_offline': 'Fake-Offline',
      'fake_realtime': 'Fake-Realtime'
    }
    return names[mode as keyof typeof names] || mode
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 1550) return 'text-green-600'
    if (rating >= 1450) return 'text-blue-600'
    return 'text-gray-600'
  }

  if (!currentAudio) {
    return <div className="bg-red-50 rounded-lg ...">错误：找不到匹配的音频实例。</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight">
            {getModelDisplayName(group.sharedMetadata.model_architecture)}
          </h3>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className={`text-sm font-medium ${getRatingColor(currentAudio.evaluation.elo_rating)}`}>
              {currentAudio.evaluation.elo_rating.toFixed(0)}
            </span>
          </div>
        </div>
        
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>参数:</span>
            <span className="font-medium">{group.sharedMetadata.model_parameters.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>数据集:</span>
            <span className="font-medium">{getDatasetDisplayName(group.sharedMetadata.training_dataset)}</span>
          </div>
          <div className="flex justify-between">
            <span>模式:</span>
            <span className="font-medium">{getModeDisplayName(group.sharedMetadata.inference_mode)}</span>
          </div>
          <div className="flex justify-between">
            <span>Prompt 时长:</span>
            <span className="font-medium">{group.sharedMetadata.prompt_length}</span>
          </div>
          <div className="flex justify-between">
            <span>生成时长:</span>
            <span className="font-medium">{group.sharedMetadata.generation_length}</span>
          </div>
          <div className="flex justify-between">
            <span>Prompt 文件:</span>
            <span className="font-medium">{group.sharedMetadata.prompt_file}</span>
          </div>
          <div className="flex justify-between">
            <span>Input 文件:</span>
            <span className="font-medium">{group.sharedMetadata.input_file}</span>
          </div>
        </div>
      </div>

      {/* --- 新增：Version 和 Temperature 选择器 --- */}
      <div className="p-4 border-b grid grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-medium text-gray-600 mb-1">Temperature</label>
          <select 
            value={selectedTemp}
            onChange={(e) => setSelectedTemp(parseFloat(e.target.value))}
            className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {group.availableTemperatures.map(temp => <option key={temp} value={temp}>{temp.toFixed(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium text-gray-600 mb-1">Version</label>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {group.availableVersions.map(ver => <option key={ver} value={ver}>{ver}</option>)}
          </select>
        </div>
      </div>

      {/* MIDI 预览区域 */}
      <div className="h-24 bg-gray-100 p-2">
        {isLoading ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
              加载预览...
            </div>
        ) : midiNotes.length > 0 ? (
          <MidiVisualizer notes={midiNotes} duration={trueDuration} isPlaying={isPlaying} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
            无预览信息
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLoading
                ? 'bg-gray-400 text-white cursor-wait'
                : isPlaying 
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isLoading ? '加载中' : isPlaying ? '暂停' : '播放'}
          </button>
          
          <div className="flex gap-1">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="详细信息"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="下载"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>时长: {trueDuration.toFixed(1)}s</span>
            <span>大小: {currentAudio.audio_info.file_size}</span>
          </div>
          <div className="flex justify-between">
            <span>投票: {currentAudio.evaluation.votes}</span>
            <span>对比: {currentAudio.evaluation.total_comparisons}</span>
          </div>
        </div>

        {/* 详细信息展开 */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-2">
            <div>
              <div className="font-medium text-gray-700 mb-1">生成参数:</div>
              <div className="space-y-1">
                <div>Temperature: {currentAudio.generation_params.temperature}</div>
                <div>Top-p: {currentAudio.generation_params.top_p}</div>
                <div>Seed: {currentAudio.generation_params.seed}</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">文件信息:</div>
              <div className="break-all">{currentAudio.filename}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
