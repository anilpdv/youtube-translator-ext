export interface SourceTranslationCue {
  readonly id: string;
  readonly parentCueId?: string;
  readonly sliceIndex?: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly context?: { readonly previousText?: string; readonly nextText?: string };
  readonly timingSource?: 'word-timing' | 'cue-timing' | 'estimated';
}

export interface TranslatedCue {
  readonly id: string;
  readonly parentCueId?: string;
  readonly sliceIndex?: number;
  readonly sourceText: string;
  readonly translatedText: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly timingSource?: 'word-timing' | 'cue-timing' | 'estimated';
}
