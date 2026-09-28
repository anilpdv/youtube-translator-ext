export interface SubtitleRenderCue {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly originalText: string;
  readonly translatedText: string | null;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
}
