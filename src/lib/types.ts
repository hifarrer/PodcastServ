export interface ScriptGenerationOptions {
  mode: "SUMMARY" | "READTHROUGH" | "DISCUSSION";
  targetMinutes?: number;
  language: string;
  style: string;
  twoSpeakers?: boolean;
  speakerNameA?: string;
  speakerNameB?: string;
  generateVideo?: boolean;
  voiceId?: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  description?: string;
  preview_url?: string;
  category: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  labels: Record<string, string>;
  sharing: {
    status: string;
    public_owner_id?: string;
  };
  high_quality_base_model_ids: string[];
  safety_control: string;
  voice_verification: {
    requires_verification: boolean;
    is_verified: boolean;
  };
  is_verified?: boolean;
  permission_on_resource: string;
  is_owner: boolean;
  is_legacy: boolean;
  is_mixed: boolean;
  favorited_at_unix?: number;
  created_at_unix: number;
}

export interface Chapter {
  title: string;
  hint: string;
}

export interface SpeakerTurn {
  speaker: string;
  text: string;
}

export interface ScriptResult {
  title: string;
  ssml: string;
  chapters: Chapter[];
  show_notes: string;
  estimated_wpm: number;
  speaker_names: { A: string; B: string };
  turns: SpeakerTurn[];
  parts30s: Record<string, string>;
}

export enum ProcessingStage {
  SCRIPT = "SCRIPT",
  AUDIO = "AUDIO", 
  SPLIT = "SPLIT",
  VIDEO_GENERATION = "VIDEO_GENERATION",
  VIDEO_MERGE = "VIDEO_MERGE",
  COMPLETE = "COMPLETE",
  ERROR = "ERROR"
}

export interface JobStatus {
  stage: ProcessingStage;
  progress: number;
  message: string;
  timestamp?: number;
  audioUrl?: string;
  videoUrl?: string;
  error?: string;
  scriptResult?: ScriptResult;
  audioParts?: string[];
  videoParts?: string[];
  mergeJobId?: string;
}

export interface GenerateRequest {
  prompt: string;
  image: File;
  options: ScriptGenerationOptions;
}

export interface FFmpegSplitResponse {
  success: boolean;
  message: string;
  parts: number;
  audio_parts: Array<{
    part: string;
    download_url: string;
  }>;
}

export interface FFmpegMergeResponse {
  success: boolean;
  job_id: string;
  status: string;
  message: string;
  status_url: string;
}

export interface FFmpegJobStatus {
  success: boolean;
  status: string;
  progress: number;
  download_url?: string;
  error?: string;
}

export interface WavespeedRequest {
  audio: string;
  image: string;
  prompt: string;
  resolution: string;
  seed: number;
}

export interface WavespeedResponse {
  id: string;
  urls: {
    get: string;
  };
  error: string;
  model: string;
  status: string;
  outputs: string[];
  timings: {
    inference: number;
  };
  created_at: string;
  has_nsfw_contents: boolean | null;
}
