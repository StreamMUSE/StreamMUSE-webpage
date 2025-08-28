import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 模拟排行榜数据
    const rankings = [
      {
        id: 'xinyue_new_05b',
        model_name: "Xinyue's New",
        parameters: '0.5B',
        elo_rating: 1658,
        total_votes: 234,
        win_rate: 0.67,
        confidence_interval: [1620, 1696]
      },
      {
        id: 'xinyue_new_chord_05b',
        model_name: "Xinyue's New+Chord",
        parameters: '0.5B', 
        elo_rating: 1624,
        total_votes: 189,
        win_rate: 0.63,
        confidence_interval: [1580, 1668]
      },
      {
        id: 'xinyue_new_025b',
        model_name: "Xinyue's New",
        parameters: '0.25B',
        elo_rating: 1545,
        total_votes: 312,
        win_rate: 0.58,
        confidence_interval: [1510, 1580]
      },
      {
        id: 'xinyue_new_chord_025b',
        model_name: "Xinyue's New+Chord", 
        parameters: '0.25B',
        elo_rating: 1523,
        total_votes: 278,
        win_rate: 0.55,
        confidence_interval: [1485, 1561]
      },
      {
        id: 'xinyue_old_05b',
        model_name: "Xinyue's Old",
        parameters: '0.5B',
        elo_rating: 1489,
        total_votes: 156,
        win_rate: 0.52,
        confidence_interval: [1445, 1533]
      },
      {
        id: 'xinyue_new_012b',
        model_name: "Xinyue's New",
        parameters: '0.12B',
        elo_rating: 1467,
        total_votes: 203,
        win_rate: 0.49,
        confidence_interval: [1425, 1509]
      },
      {
        id: 'xinyue_old_025b',
        model_name: "Xinyue's Old",
        parameters: '0.25B',
        elo_rating: 1445,
        total_votes: 167,
        win_rate: 0.47,
        confidence_interval: [1400, 1490]
      },
      {
        id: 'xinyue_new_chord_012b',
        model_name: "Xinyue's New+Chord",
        parameters: '0.12B',
        elo_rating: 1423,
        total_votes: 145,
        win_rate: 0.45,
        confidence_interval: [1375, 1471]
      },
      {
        id: 'xinyue_old_012b',
        model_name: "Xinyue's Old", 
        parameters: '0.12B',
        elo_rating: 1389,
        total_votes: 134,
        win_rate: 0.42,
        confidence_interval: [1340, 1438]
      }
    ]
    
    return NextResponse.json({
      success: true,
      data: rankings,
      meta: {
        total_comparisons: rankings.reduce((sum, r) => sum + r.total_votes, 0),
        last_updated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Rankings API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rankings' },
      { status: 500 }
    )
  }
}
