import type { TranslationBatch } from '../domain/TranslationBatch';
import type { ProviderAvailability } from './ProviderAvailability';
import type { ProviderResponse } from './ProviderResponse';

export interface ProviderContext {
  readonly sessionId: string;
  readonly videoId?: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly modelId: string;
  readonly promptVersion: string;
  readonly signal: AbortSignal;
}

export type TranslationBatchInput = Pick<
  TranslationBatch,
  'id' | 'index' | 'cues'
>;

export interface TranslationProvider {
  readonly id: string;
  checkAvailability(
    modelId?: string,
    signal?: AbortSignal,
  ): Promise<ProviderAvailability>;
  translateBatch(
    batch: TranslationBatchInput,
    context: ProviderContext,
  ): Promise<ProviderResponse>;
}
