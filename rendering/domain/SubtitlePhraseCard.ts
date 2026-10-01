export interface SubtitlePhraseCard {
  readonly id: string;
  readonly parentCueIds: readonly string[];
  readonly startMs: number;
  readonly endMs: number;
  readonly originalText: string;
  readonly translatedText: string | null;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly timingSource: 'word-timing' | 'cue-timing' | 'estimated';
  readonly boundaryReason:
    | 'sentence'
    | 'punctuation'
    | 'silence'
    | 'line-capacity'
    | 'duration-limit'
    | 'source-cue-end';
  readonly stable: true;
}
