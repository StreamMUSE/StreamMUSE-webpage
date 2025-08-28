// src/lib/midiPlayer.ts
import * as Tone from 'tone'
import { Midi } from '@tonejs/midi' // 引入我们刚刚安装的库

export class MidiPlayer {
  private synth: Tone.PolySynth | null = null; // 使用 PolySynth 支持多音符同时播放
  private isInitialized = false;
  private activeMidi: Midi | null = null;
  private scheduledEvents: number[] = []; // 用于存储已安排的事件ID

  async initialize() {
    if (this.isInitialized) return;
    try {
      await Tone.start();
      // 使用 PolySynth 可以更好地处理和弦和复杂的MIDI
      this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Tone.js:', error);
    }
  }

  // --- 专门用于播放已解析的Midi对象的函数 ---
  /**
   * Plays a pre-parsed Midi object.
   * @param midi The parsed Midi object from @tonejs/midi
   */
  async play(midi: Midi) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.synth) return;

    this.stop(); // 播放前确保停止之前的音乐

    const transport = Tone.getTransport();
    const now = Tone.now() + 0.1;

    midi.tracks.forEach(track => {
      track.notes.forEach(note => {
        const eventId = transport.scheduleOnce((time) => {
          this.synth?.triggerAttackRelease(
            note.name,
            note.duration,
            time,
            note.velocity
          );
        }, now + note.time);
        this.scheduledEvents.push(eventId);
      });
    });

    transport.start();
  }

  /**
   * 从 URL 加载并播放 MIDI 文件
   * @param url 指向 .mid 文件的网络路径
   */
  async loadAndPlayFromUrl(url: string) {
    const midi = await Midi.fromUrl(url);
    await this.play(midi);
  }

  stop() {
    // 取消所有已安排的事件
    this.scheduledEvents.forEach(id => Tone.getTransport().clear(id));
    this.scheduledEvents = [];
    
    // 停止走带并释放所有当前发声的音符
    if (Tone.getTransport().state === "started") {
      Tone.getTransport().stop();
    }
    
    // --- 新增：将播放头重置到起点 ---
    Tone.getTransport().position = 0;

    this.synth?.releaseAll();
  }
}

// Global instance (保持不变)
let globalMidiPlayer: MidiPlayer | null = null;

export function getGlobalMidiPlayer(): MidiPlayer {
  if (!globalMidiPlayer) {
    globalMidiPlayer = new MidiPlayer();
  }
  return globalMidiPlayer;
}

// playDemoMidi 保持不变，用于其他地方的测试
const demoMelody = [
    { note: 'C4', duration: '4n', time: 0 },
    { note: 'D4', duration: '4n', time: 0.5 },
    { note: 'E4', duration: '4n', time: 1 },
];
export async function playDemoMidi(): Promise<void> {
    const player = getGlobalMidiPlayer();
    player.stop(); // 播放前先停止
    if (!player['isInitialized']) await player.initialize();
    const synth = player['synth'];
    if (synth) {
      const now = Tone.now();
      demoMelody.forEach(({ note, duration, time }) => {
        synth.triggerAttackRelease(note, duration, now + time);
      });
    }
}