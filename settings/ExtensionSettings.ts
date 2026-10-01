export interface ExtensionSettings {
  readonly provider: 'gemini';
  readonly apiKey: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  /** @deprecated Visibility is controlled by the active per-video session. */
  readonly autoTranslate: boolean;

  readonly subtitleFontSize: number;
  readonly subtitleFontWeight: 400 | 500 | 600 | 700;
  readonly subtitleFontColor: string;
  readonly subtitleTextShadow: 'none' | 'soft' | 'strong';
  readonly subtitleLineHeight: number;
  readonly subtitleBackground: string;
  readonly subtitleBackgroundOpacity: number;
  readonly subtitlePosition: 'bottom' | 'top';
  readonly subtitleVerticalOffset: number;
  readonly subtitleMaxWidth: number;
  readonly subtitleAlignment: 'left' | 'center';
  readonly subtitleBilingual: boolean;
  readonly bilingualOrder: 'translation-first' | 'original-first';
  readonly bilingualOriginalScale: number;
  readonly bilingualOriginalOpacity: number;
  readonly subtitleSyncOffsetMs: number;
  readonly subtitleMinDuration: number;
  readonly subtitleMaxDuration: number;
  readonly subtitleReadingSpeed: 'slow' | 'normal' | 'fast';
  readonly duplicateMergeGap: number;
  readonly subtitleSoundLabels: 'show' | 'original-only' | 'hide';
  readonly subtitleMaxLines: number;
  readonly subtitleMaxCharactersPerLine: number;
  readonly subtitleMaxCJKCharactersPerLine: number;
}
