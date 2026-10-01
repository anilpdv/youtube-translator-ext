import type { SubtitlePhraseCard } from './SubtitlePhraseCard';

export interface SubtitlePhraseTrack {
  readonly sessionId: string;
  readonly videoId: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly cards: readonly SubtitlePhraseCard[];
  readonly durationMs: number;
  readonly planningVersion: string;
}
