import { Voice } from "../entities/Voice";

export interface ISynthesizeOptions {
  text: string;
  voiceId?: string; // e.g., 'en-US-Neural2-F'
  languageCode?: string;
  pitch?: number; // 0.5 to 2.0
  speakingRate?: number; // 0.25 to 4.0
}

export interface ITtsResponse {
  audio: Buffer;
  marks?: any[]; // Timepoints
  warning?: string; // Optional warning message (e.g. for quota limits)
}

export interface ITtsService {
  getVoices(languageCode?: string): Promise<Voice[]>;
  synthesize(options: ISynthesizeOptions): Promise<ITtsResponse>;
}
