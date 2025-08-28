# StreamMUSE 网页项目指南

## 🎯 项目概述

这是一个为 StreamMUSE 音乐伴奏生成项目创建的交互式展示网页，主要功能包括：

1. **盲测评测系统** - 游戏化的 A/B 测试平台
2. **音频展示库** - 多维度筛选的音频库
3. **实时排行榜** - 基于 ELO 评分的排名系统
4. **MIDI 可视化** - 钢琴卷帘图展示

## 🏗️ 项目结构

```
StreamMUSE-webpage/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── audio/         # 音频数据 API
│   │   │   └── rankings/      # 排行榜 API
│   │   ├── globals.css        # 全局样式
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx           # 主页
│   ├── components/            # React 组件
│   │   ├── AudioCard.tsx              # 音频卡片组件
│   │   ├── AudioLibrarySection.tsx    # 音频库区域
│   │   ├── BlindTestSection.tsx       # 盲测评测区域
│   │   ├── HeroSection.tsx            # 首页横幅
│   │   ├── MidiVisualizer.tsx         # MIDI 可视化
│   │   └── RankingsSection.tsx        # 排行榜组件
│   ├── lib/                   # 工具库
│   │   └── midiUtils.ts       # MIDI 处理工具
│   └── types/                 # TypeScript 类型
│       └── index.ts           # 主要类型定义
├── public/
│   ├── audio/                 # 音频文件存储
│   │   ├── xinyue_old/        # 按模型分类
│   │   ├── xinyue_new/
│   │   └── xinyue_new_chord/
│   └── metadata/              # 元数据文件
│       └── audio_catalog.json # 音频目录配置
└── 配置文件...
```

## 🎵 音频文件组织

### 目录结构
```
public/audio/
└── {model_architecture}/     # xinyue_old, xinyue_new, xinyue_new_chord
    └── {parameters}/         # 012b, 025b, 05b  
        └── {dataset}/        # pop909, aria_unique, aria_deduped
            └── {mode}/       # offline, real_time, simulator
                └── *.mid     # MIDI 文件
```

### 文件命名规范
```
{model}_{params}_{dataset}_{mode}_{length}.mid

示例:
xinyue_new_025b_aria_unique_real_time_30s.mid
```

## �� 数据类型定义

### AudioMetadata 接口
```typescript
interface AudioMetadata {
  id: string                    // 唯一标识符
  filename: string              // 文件名
  metadata: {
    model_architecture: string  // 模型架构
    model_parameters: string    // 参数量
    training_dataset: string    // 训练数据集
    prompt_length: string       // Prompt 长度
    generation_length: string   // 生成长度
    prompt_matching: string     // 匹配类型
    inference_mode: string      // 推理模式
  }
  audio_info: {
    duration: number           // 时长（秒）
    file_size: string         // 文件大小
    format: string            // 文件格式
  }
  generation_params: {
    temperature: number       // 生成温度
    top_p: number            // Top-p 参数
    seed: number             // 随机种子
  }
  evaluation: {
    votes: number            // 投票数
    elo_rating: number       // ELO 评分
    total_comparisons: number // 总对比次数
  }
  midi_url?: string          // MIDI 文件 URL
  created_at: string         // 创建时间
}
```

## 🔧 开发指南

### 添加新音频文件

1. **放置文件**：将 MIDI 文件放入对应的目录结构中
2. **更新 API**：修改 `src/app/api/audio/route.ts` 中的数据生成逻辑
3. **测试**：刷新页面确认文件正确加载

### 自定义筛选条件

在 `AudioLibrarySection.tsx` 中：
```typescript
// 添加新的筛选选项
<select onChange={(e) => updateFilter('new_filter', e.target.value)}>
  <option value="all">全部</option>
  <option value="option1">选项1</option>
</select>

// 更新筛选逻辑
if (filters.new_filter) {
  filtered = filtered.filter(audio => 
    audio.metadata.new_field === filters.new_filter
  )
}
```

### 修改 ELO 算法

在 `src/app/api/rankings/route.ts` 中替换排名计算逻辑：
```typescript
// 示例：简单胜率排名
const calculateRanking = (wins: number, total: number) => {
  return total > 0 ? (wins / total) * 1000 + 1000 : 1000
}
```

### MIDI 可视化定制

在 `MidiVisualizer.tsx` 中：
```typescript
// 修改颜色方案
const getColorForPitch = (pitch: number) => {
  // 自定义颜色逻辑
  return `hsl(${pitch * 3}, 70%, 60%)`
}

// 调整显示参数
const noteHeight = 6        // 音符高度
const pixelsPerSecond = 50  // 时间轴密度
```

## 🚀 部署指南

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 生产构建
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### 部署到 Vercel
1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 自动部署完成

## 🔬 研究功能

### 盲测数据收集

投票数据结构：
```typescript
interface ComparisonResult {
  id: string          // 对比 ID
  audio_a_id: string  // 音频 A 标识
  audio_b_id: string  // 音频 B 标识  
  winner: string      // 获胜者 ('a', 'b', 'tie', 'skip')
  user_id?: string    // 用户标识（可选）
  timestamp: string   // 时间戳
}
```

### 数据导出

可以通过 API 导出评测数据：
```bash
# 获取所有投票记录
GET /api/votes

# 获取排行榜数据
GET /api/rankings

# 获取音频库数据
GET /api/audio
```

## 🎨 UI 定制

### 主题色彩
在 `tailwind.config.js` 中修改：
```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
      secondary: '#your-color'
    }
  }
}
```

### 布局调整
- 修改 `layout.tsx` 调整导航栏
- 修改各个 Section 组件调整页面布局
- 修改 `globals.css` 调整全局样式

## 📈 性能优化

1. **MIDI 文件缓存**：浏览器自动缓存静态文件
2. **懒加载**：音频库使用分页加载
3. **组件优化**：使用 React.memo 和 useMemo
4. **图片优化**：使用 Next.js Image 组件

## 🐛 常见问题

### MIDI 文件不显示
- 检查文件路径是否正确
- 确认文件格式为标准 MIDI
- 查看浏览器控制台错误信息

### API 请求失败
- 确认 API 路由正确
- 检查数据格式匹配
- 查看服务器日志

### 样式不生效
- 确认 Tailwind CSS 类名正确
- 检查 CSS 文件导入
- 清除浏览器缓存

## 📞 技术支持

如需帮助，请：
1. 查看浏览器开发者工具的控制台错误
2. 检查网络请求是否成功
3. 参考项目文档和代码注释
4. 联系开发团队

---

*最后更新：2025年8月27日*
