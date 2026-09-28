export interface TranslationCacheKey {
  readonly videoId: string;
  readonly captionTrackId: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly promptVersion: string;
  readonly batchingVersion: string;
  readonly sourceCaptionHash: string;
}

export function serializeTranslationCacheKey(key: TranslationCacheKey): string {
  return [
    'translation',
    key.videoId,
    key.captionTrackId,
    key.sourceLanguage,
    key.targetLanguage,
    key.providerId,
    key.modelId,
    key.promptVersion,
    key.batchingVersion,
    key.sourceCaptionHash,
  ].map(encodeURIComponent).join(':');
}
