import type { TranslationBatch } from '../../translation/domain/TranslationBatch';
import type { ProviderResponse } from '../../translation/providers/ProviderResponse';

export interface TranslateBatchMessage {
  readonly type: 'translation.translate-batch';
  readonly sessionId: string;
  readonly videoId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly promptVersion: string;
  readonly batch: Pick<TranslationBatch, 'id' | 'index' | 'cues'>;
}

export interface CancelTranslationMessage {
  readonly type: 'translation.cancel-session';
  readonly sessionId: string;
}

export type TranslationMessage =
  | TranslateBatchMessage
  | CancelTranslationMessage;

export interface TranslationBatchResponse {
  readonly success: boolean;
  readonly data?: ProviderResponse;
  readonly error?: string;
}
