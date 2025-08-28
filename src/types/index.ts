export interface AudioMetadata {
  id: string;
  filename: string;
  version: string;
  audio_info: {
    duration: number;
    file_size: string;
    format: 'midi' | 'mp3' | 'wav';
  };
  generation_params: {
    temperature: number;
    top_p: number;
    seed: number;
  };
  evaluation: {
    votes: number;
    elo_rating: number;
    total_comparisons: number;
  };
  midi_url?: string;
  audio_url?: string;
  created_at: string;
}

// 代表一个卡片组
export interface AudioCardGroup {
  groupId: string;
  sharedMetadata: {
    model_architecture: string;
    model_parameters: string;
    training_dataset: 'pop909' | 'aria_unique' | 'aria_deduped';
    prompt_file: string;
    prompt_length: '75t' | '100t' | '150t' | '200t';
    input_file: string;
    generation_length: '100t' | '200t';
    inference_mode: 'offline' | 'fake_offline' | 'real_time' | 'fake_realtime' | 'simulator';
  };
  instances: AudioMetadata[];
  availableTemperatures: number[];
  availableVersions: string[];
}

export interface ComparisonResult {
  id: string;
  audio_a_id: string;
  audio_b_id: string;
  winner: 'a' | 'b' | 'tie' | 'skip';
  user_id?: string;
  timestamp: string;
  comparison_type: string;
}

export interface FilterOptions {
  model_architecture?: string;
  model_parameters?: string;
  training_dataset?: string;
  prompt_length?: string;
  generation_length?: string;
  prompt_matching?: string;
  inference_mode?: string;
  search_query?: string;
}

export interface MidiNote {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
  channel: number;
}

export interface MidiTrack {
  name: string;
  notes: MidiNote[];
  instrument: number;
}
