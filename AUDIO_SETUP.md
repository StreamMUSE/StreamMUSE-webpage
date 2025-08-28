# StreamMUSE 音频播放功能说明

## 🎵 音频播放实现

我已经为你的 StreamMUSE 网页添加了完整的音频播放功能！

### ✅ 已实现的功能

1. **真实的 MIDI 播放**
   - 使用 Tone.js 进行音频合成
   - 支持真实的 MIDI 文件加载和播放
   - 包含音量控制、暂停/播放功能

2. **示例音乐播放**
   - 当没有真实 MIDI 文件时，播放 C 大调音阶示例
   - 用于演示和测试音频功能

3. **交互式播放控制**
   - 播放/暂停按钮
   - 加载状态指示器
   - 错误处理和用户反馈

4. **盲测音频对比**
   - 确保同时只播放一个音频
   - 自动停止其他音频
   - 投票时自动停止播放

### 🔧 技术实现

#### 核心组件

1. **MidiPlayer 类** (`src/lib/midiPlayer.ts`)
   - 基于 Tone.js 的 MIDI 播放器
   - 支持多音符同时播放
   - 包含完整的生命周期管理

2. **更新的组件**
   - `AudioCard.tsx` - 音频库中的播放功能
   - `BlindTestSection.tsx` - 盲测区域的音频对比
   - `AudioTestButton.tsx` - 首页的音频测试按钮

#### 播放流程

```typescript
// 1. 初始化播放器
const player = getGlobalMidiPlayer()
await player.initialize()

// 2. 加载 MIDI 文件
await player.loadMidiFromUrl('/path/to/file.mid')

// 3. 开始播放
await player.play()

// 4. 停止播放
player.stop()
```

### 🎯 使用方法

#### 测试音频功能
1. 访问 http://localhost:3000
2. 在首页点击 "🎵 测试音频" 按钮
3. 应该能听到 C 大调音阶的演奏

#### 在音频库中播放
1. 滚动到 "音频展示库" 部分
2. 点击任意音频卡片的 "播放" 按钮
3. 目前播放示例音乐（当有真实文件时会播放真实内容）

#### 盲测对比播放
1. 进入 "音乐盲测挑战" 区域
2. 分别点击 "音频 A" 和 "音频 B" 的播放按钮
3. 系统确保同时只播放一个音频

### 📁 添加真实 MIDI 文件

要播放你的真实 MIDI 文件：

1. **放置文件**
   ```
   public/audio/
   ├── xinyue_old/012b/pop909/offline/
   │   └── sample.mid
   ├── xinyue_new/025b/aria_unique/real_time/
   │   └── sample.mid
   └── ...
   ```

2. **更新 API 数据**
   在 `src/app/api/audio/route.ts` 中更新 `midi_url` 字段：
   ```typescript
   midi_url: `/audio/${model}/${param}/${dataset}/${mode}/sample.mid`
   ```

3. **验证播放**
   - 确保 MIDI 文件格式正确
   - 文件路径可以通过浏览器访问
   - 检查浏览器控制台是否有错误

### 🔍 故障排除

#### 常见问题

1. **没有声音**
   - 检查浏览器音量设置
   - 确保浏览器允许音频自动播放
   - 尝试点击测试按钮进行初始化

2. **播放失败**
   - 打开浏览器开发者工具查看错误信息
   - 检查 MIDI 文件是否存在且可访问
   - 确认网络连接正常

3. **浏览器兼容性**
   - Chrome/Safari: 完全支持
   - Firefox: 支持，可能需要用户交互后才能播放
   - 移动浏览器: 支持，但可能有延迟

#### 调试方法

```javascript
// 在浏览器控制台中测试
import { playDemoMidi } from '/src/lib/midiPlayer.js'
await playDemoMidi()
```

### 🚀 进一步优化

#### 可以添加的功能

1. **播放进度条**
   ```typescript
   // 获取播放进度
   const progress = player.getCurrentTime() / player.getDuration()
   ```

2. **音量控制**
   ```typescript
   // 调整音量
   player.setVolume(0.5) // 0-1 范围
   ```

3. **播放速度控制**
   ```typescript
   // 调整播放速度
   Tone.Transport.bpm.value = 120 // BPM
   ```

4. **循环播放**
   ```typescript
   // 设置循环
   player.setLoop(true)
   ```

### 📊 性能考虑

- **内存管理**: 播放器会自动清理资源
- **并发控制**: 全局单例确保不会重复初始化
- **错误恢复**: 包含完整的错误处理机制

### 💡 下一步建议

1. **上传你的 MIDI 文件** 到对应目录
2. **测试音频播放功能** 确保一切正常
3. **根据需要调整音色** 或添加更多乐器
4. **收集用户反馈** 进一步优化体验

---

现在你的网站已经具备完整的音频播放功能了！🎉
