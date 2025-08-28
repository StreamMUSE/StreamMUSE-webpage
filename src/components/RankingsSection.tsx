'use client'

import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, Users, BarChart3 } from 'lucide-react'

interface RankingData {
  id: string
  model_name: string
  parameters: string
  elo_rating: number
  total_votes: number
  win_rate: number
  confidence_interval: [number, number]
}

export default function RankingsSection() {
  const [rankings, setRankings] = useState<RankingData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalComparisons, setTotalComparisons] = useState(0)

  useEffect(() => {
    fetchRankings()
  }, [])

  const fetchRankings = async () => {
    try {
      const response = await fetch('/api/rankings')
      const result = await response.json()
      
      if (result.success) {
        setRankings(result.data)
        setTotalComparisons(result.meta.total_comparisons)
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600 bg-yellow-50'
    if (rank === 2) return 'text-gray-600 bg-gray-50'
    if (rank === 3) return 'text-orange-600 bg-orange-50'
    return 'text-gray-500 bg-gray-50'
  }

  const getRankIcon = (rank: number) => {
    if (rank <= 3) return <Trophy className="w-5 h-5" />
    return <span className="text-sm font-bold">#{rank}</span>
  }

  const formatConfidenceInterval = (interval: [number, number]) => {
    return `${interval[0]}-${interval[1]}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalComparisons}</div>
          <div className="text-sm text-gray-600">总投票数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <BarChart3 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{rankings.length}</div>
          <div className="text-sm text-gray-600">参与模型</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {rankings[0]?.elo_rating || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">最高 ELO</div>
        </div>
      </div>

      {/* 排行榜表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            模型排行榜
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            基于用户盲测投票的 ELO 评分排名
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  排名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  模型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  参数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ELO 评分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  胜率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  投票数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  置信区间
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rankings.map((ranking, index) => {
                const rank = index + 1
                return (
                  <tr key={ranking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${getRankColor(rank)}`}>
                        {getRankIcon(rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ranking.model_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ranking.parameters}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {ranking.elo_rating}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {(ranking.win_rate * 100).toFixed(1)}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${ranking.win_rate * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ranking.total_votes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatConfidenceInterval(ranking.confidence_interval)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 说明文字 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">评分说明</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• <strong>ELO 评分</strong>: 基于国际象棋评分系统，初始评分 1500</li>
          <li>• <strong>胜率</strong>: 在所有对比中获胜的百分比</li>
          <li>• <strong>置信区间</strong>: 基于投票数量计算的评分可信范围</li>
          <li>• <strong>投票数</strong>: 该模型参与的总对比次数</li>
        </ul>
      </div>
    </div>
  )
}
