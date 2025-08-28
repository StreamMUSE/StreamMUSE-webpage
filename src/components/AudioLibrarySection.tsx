'use client';

import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import AudioCard from './AudioCard';
import type { AudioCardGroup, FilterOptions } from '@/types';

export default function AudioLibrarySection() {
  const [audioGroups, setAudioGroups] = useState<AudioCardGroup[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 当筛选条件或搜索词变化时，从后端 API 获取数据
  useEffect(() => {
    const fetchAudioData = async () => {
      setLoading(true);
      try {
        // 使用 URLSearchParams 帮助我们安全地构建查询 URL
        const params = new URLSearchParams();
        
        // 将当前有效的筛选条件添加到 URL 参数中
        if (filters.model_architecture) params.append('model_architecture', filters.model_architecture);
        if (filters.model_parameters) params.append('model_parameters', filters.model_parameters);
        if (filters.training_dataset) params.append('training_dataset', filters.training_dataset);
        if (filters.inference_mode) params.append('inference_mode', filters.inference_mode);
        if (searchQuery) params.append('search', searchQuery);

        // 调用我们的后端 API
        const response = await fetch(`/api/audio?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        
        if (result.success) {
          setAudioGroups(result.data); // 更新音频组状态
        }
      } catch (error) {
        console.error('Failed to fetch audio data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // 使用一个简单的防抖 (debounce) 来避免在用户快速输入时发送过多请求
    const handler = setTimeout(() => {
      fetchAudioData();
    }, 300); // 延迟300毫秒执行

    // 清理函数，当组件卸载或依赖项变化时清除上一个计时器
    return () => {
      clearTimeout(handler);
    };
  }, [filters, searchQuery]); // 当 filters 或 searchQuery 变化时，重新执行 useEffect


  // 更新筛选条件的状态
  const updateFilter = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  // 清除所有筛选条件
  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };
  
  // 初始加载时的 loading 动画
  if (loading && audioGroups.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 筛选器 UI */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">筛选条件</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型架构</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.model_architecture || 'all'}
              onChange={(e) => updateFilter('model_architecture', e.target.value)}
            >
              <option value="all">全部</option>
              <option value="xinyue_old">Xinyue's Old</option>
              <option value="xinyue_new">Xinyue's New</option>
              <option value="xinyue_new_chord">Xinyue's New with Chord</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">参数量</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.model_parameters || 'all'}
              onChange={(e) => updateFilter('model_parameters', e.target.value)}
            >
              <option value="all">全部</option>
              <option value="0.12b">0.12B</option>
              <option value="0.25b">0.25B</option>
              <option value="0.5b">0.5B</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">训练数据集</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.training_dataset || 'all'}
              onChange={(e) => updateFilter('training_dataset', e.target.value)}
            >
              <option value="all">全部</option>
              <option value="pop909">POP909</option>
              <option value="aria_unique">ARIA-Unique</option>
              <option value="aria_deduped">ARIA-Deduped</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">推理模式</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.inference_mode || 'all'}
              onChange={(e) => updateFilter('inference_mode', e.target.value)}
            >
              <option value="all">全部</option>
              <option value="offline">Offline</option>
              <option value="real_time">Real-time</option>
              <option value="simulator">Simulator</option>
            </select>
          </div>

          {/* 清除按钮 */}
          <div className="flex items-end">
            <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
                清除筛选
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="按文件名搜索..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 结果统计 */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-gray-600">
          找到 <span className="font-semibold text-gray-900">{audioGroups.length}</span> 个音频设置组
        </div>
      </div>

      {/* 音频网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {audioGroups.map(group => (
          <AudioCard key={group.groupId} group={group} />
        ))}
      </div>

      {audioGroups.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">没有找到符合条件的音频</div>
          <button 
            onClick={clearFilters}
            className="text-blue-600 hover:text-blue-700"
          >
            清除所有筛选条件
          </button>
        </div>
      )}
    </div>
  )
}