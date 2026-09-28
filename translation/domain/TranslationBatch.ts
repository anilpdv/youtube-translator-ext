import type { SourceTranslationCue, TranslatedCue } from './TranslationCue';

export type TranslationBatchStatus =
  | 'pending'
  | 'translating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TranslationBatch {
  readonly id: string;
  readonly index: number;
  readonly cues: readonly SourceTranslationCue[];
  readonly characterCount: number;
  readonly estimatedCost: number;
}

export interface TranslationBatchResult {
  readonly batchId: string;
  readonly batchIndex: number;
  readonly status: 'completed' | 'failed' | 'cancelled';
  readonly translations: readonly TranslatedCue[];
  readonly attempts: number;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly errorCode?: string;
}
