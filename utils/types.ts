export interface TranscriptSegment {
  id?: string;
  start: number; // in seconds
  dur: number;   // in seconds
  text: string;
  source?: 'timedtext' | 'transcript-dom' | 'live';
}

export interface TranslatedSegment extends TranscriptSegment {
  translatedText: string;
  translationStatus?: 'translated' | 'fallback' | 'failed';
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  author: string;
  availableCaptionTracks: CaptionTrack[];
}

export interface CaptionTrack {
  baseUrl: string;
  name: { simpleText?: string; runs?: Array<{ text: string }> };
  vssId: string;
  languageCode: string;
  kind?: string;
  isTranslatable?: boolean;
}

export interface SubtitleTimingSettings {
  minDuration: number;
  maxDuration: number;
  gapBeforeNextCue: number;
  wordsPerSecond: number;
  charsPerSecondCJK: number;
  punctuationBonus: number;
  syncOffset: number;
  duplicateMergeGap?: number;
}

export const READING_SPEED_PRESETS: Record<'slow' | 'normal' | 'fast', { wordsPerSecond: number; charsPerSecondCJK: number }> = {
  slow: {
    wordsPerSecond: 2.2,
    charsPerSecondCJK: 5,
  },
  normal: {
    wordsPerSecond: 2.8,
    charsPerSecondCJK: 7,
  },
  fast: {
    wordsPerSecond: 3.4,
    charsPerSecondCJK: 9,
  },
};

export const DEFAULT_TIMING: SubtitleTimingSettings = {
  minDuration: 1.4,
  maxDuration: 6.0,
  gapBeforeNextCue: 0.12,
  wordsPerSecond: 2.8,
  charsPerSecondCJK: 7,
  punctuationBonus: 0.35,
  syncOffset: 0,
};

export interface ExtensionSettings {
  provider: 'youtube' | 'builtin' | 'ollama' | 'gemini' | 'openrouter';
  apiKey: string;          // Gemini API Key
  openrouterKey: string;   // OpenRouter API Key
  openrouterModel: string;
  ollamaEndpoint: string;  // Local Ollama (default: http://localhost:11434)
  ollamaModel: string;     // Local model (default: qwen2.5:0.5b or llama3.2:1b)
  sourceLanguage: string;  // 'auto' or 'de', 'es', 'ja', etc.
  targetLanguage: string;
  autoTranslate: boolean;

  // Subtitle appearance - Text
  subtitleFontSize: number;
  subtitleFontWeight: 400 | 500 | 600 | 700;
  subtitleFontColor: string;
  subtitleTextShadow: 'none' | 'soft' | 'strong';
  subtitleLineHeight: number;

  // Subtitle appearance - Layout & Background
  subtitleBackground: string;
  subtitleBackgroundOpacity: number;
  subtitlePosition: 'bottom' | 'top';
  subtitleVerticalOffset: number; // in px (-120 to +120)
  subtitleMaxWidth: number;       // in percentage (40 to 100)
  subtitleAlignment: 'left' | 'center';

  // Subtitle appearance - Bilingual
  subtitleBilingual: boolean;
  bilingualOrder: 'translation-first' | 'original-first';
  bilingualOriginalScale: number;
  bilingualOriginalOpacity: number;

  // Timing & Segmentation
  subtitleSyncOffsetMs: number; // in ms (-3000 to +3000)
  subtitleMinDuration: number;
  subtitleMaxDuration: number;
  subtitleReadingSpeed: 'slow' | 'normal' | 'fast';
  duplicateMergeGap: number;    // in seconds (default 1.0)
  subtitleSoundLabels: 'show' | 'original-only' | 'hide';
  subtitleMaxLines: number;
  subtitleMaxCharactersPerLine: number;
  subtitleMaxCJKCharactersPerLine: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  provider: 'youtube',
  apiKey: '',
  openrouterKey: '',
  openrouterModel: 'openai/gpt-4o-mini',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'gemma2:2b',
  sourceLanguage: 'auto',
  targetLanguage: 'English',
  autoTranslate: true,

  // Text
  subtitleFontSize: 24,
  subtitleFontWeight: 600,
  subtitleFontColor: '#FFFFFF',
  subtitleTextShadow: 'strong',
  subtitleLineHeight: 1.3,

  // Layout & Background
  subtitleBackground: '#000000',
  subtitleBackgroundOpacity: 0.75,
  subtitlePosition: 'bottom',
  subtitleVerticalOffset: 0,
  subtitleMaxWidth: 82,
  subtitleAlignment: 'center',

  // Bilingual
  subtitleBilingual: false,
  bilingualOrder: 'translation-first',
  bilingualOriginalScale: 0.78,
  bilingualOriginalOpacity: 0.72,

  // Timing
  subtitleSyncOffsetMs: 0,
  subtitleMinDuration: 1.4,
  subtitleMaxDuration: 6.0,
  subtitleReadingSpeed: 'normal',
  duplicateMergeGap: 1.0,
  subtitleSoundLabels: 'show',
  subtitleMaxLines: 2,
  subtitleMaxCharactersPerLine: 42,
  subtitleMaxCJKCharactersPerLine: 20,
};

export type TranslationPhase =
  | 'idle'
  | 'extracting'
  | 'translating'
  | 'partial'
  | 'ready'
  | 'error'
  | 'cancelled'
  | 'unsupported';

export interface TranslationStateSnapshot {
  phase: TranslationPhase;
  message: string;
  videoId: string | null;
  translatedCount: number;
  totalCount: number;
  hasSubtitles: boolean;
  subtitlesEnabled: boolean;
  transcriptPanelOpen: boolean;
  error?: string;
}
