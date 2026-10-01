export interface SourceTranslationCue {
  readonly id: string;
  readonly parentCueId?: string;
  readonly sliceIndex?: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly context?: { readonly previousText?: string; readonly nextText?: string };
}

export interface TranslatedCue {
  readonly id: string;
  readonly parentCueId?: string;
  readonly sliceIndex?: number;
  readonly sourceText: string;
  readonly translatedText: string;
  readonly startMs: number;
  readonly endMs: number;
}
