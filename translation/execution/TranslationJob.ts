import type { TranslationBatchResult } from '../domain/TranslationBatch';

export interface TranslationJob {
  readonly sessionId: string;
  readonly batches: readonly TranslationBatchResult[];
  readonly cancelled: boolean;
}
