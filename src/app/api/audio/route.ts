import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises'; // 使用 'fs/promises' 模块，方便使用 async/await
import type { AudioCardGroup } from '@/types';

// 在内存中设置一个简单的缓存，避免每次请求都重复读取文件
let audioDatabase: AudioCardGroup[] | null = null;

/**
 * 读取并解析 audio_catalog.json 文件。
 * 第一次调用时会读取文件并缓存结果，后续调用直接返回缓存。
 */
async function getAudioDatabase(): Promise<AudioCardGroup[]> {
  // 如果缓存已存在，直接返回缓存
  if (audioDatabase) {
    return audioDatabase;
  }

  try {
    // 拼接文件的绝对路径
    const filePath = path.join(process.cwd(), 'public', 'metadata', 'audio_catalog.json');
    // 异步读取文件内容
    const fileContent = await fs.readFile(filePath, 'utf-8');
    // 解析 JSON 字符串并存入缓存
    audioDatabase = JSON.parse(fileContent);
    return audioDatabase!;
  } catch (error) {
    console.error('Failed to read or parse audio_catalog.json:', error);
    // 如果文件不存在或解析失败，返回一个空数组，避免整个应用崩溃
    return [];
  }
}

// 处理 GET 请求
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 获取所有可能的查询参数
    const model = searchParams.get('model_architecture');
    const params = searchParams.get('model_parameters');
    const dataset = searchParams.get('training_dataset');
    const mode = searchParams.get('inference_mode');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '48');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 从我们的函数获取数据（可能是从文件读取或从缓存读取）
    let audioGroups = await getAudioDatabase();

    // --- 开始应用筛选逻辑 ---
    if (model && model !== 'all') {
      audioGroups = audioGroups.filter(audio => audio.sharedMetadata.model_architecture === model);
    }
    if (params && params !== 'all') {
      audioGroups = audioGroups.filter(audio => audio.sharedMetadata.model_parameters === params);
    }
    if (dataset && dataset !== 'all') {
      audioGroups = audioGroups.filter(audio => audio.sharedMetadata.training_dataset === dataset);
    }
    if (mode && mode !== 'all') {
        audioGroups = audioGroups.filter(audio => audio.sharedMetadata.inference_mode === mode);
    }
    if (search) {
      const searchLower = search.toLowerCase();
        audioGroups = audioGroups.filter(group => 
            // 可以在 groupId 中搜索，也可以遍历 instances 的 filename
            group.groupId.toLowerCase().includes(searchLower) ||
            group.instances.some(instance => instance.filename.toLowerCase().includes(searchLower))
        );
    }
    // --- 筛选结束 ---

    // 分页
    const total = audioGroups.length;
    const paginatedList = audioGroups.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedList,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST 方法保持不变，用于接收投票
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { audio_a_id, audio_b_id, winner, comparison_type } = body
        
        console.log('New comparison result:', {
          audio_a_id,
          audio_b_id, 
          winner,
          comparison_type,
          timestamp: new Date().toISOString()
        })
        
        return NextResponse.json({
          success: true,
          message: 'Vote recorded successfully'
        })
      } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to record vote' },
          { status: 500 }
        )
      }
}