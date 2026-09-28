import type { SubtitleRenderCue } from './SubtitleRenderCue';

export interface SubtitleRenderTrack {
  readonly sessionId: string;
  readonly videoId: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly cues: readonly SubtitleRenderCue[];
  readonly durationMs: number;
  readonly completed: boolean;
}
