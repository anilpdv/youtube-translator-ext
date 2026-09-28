import type { CaptionDocument } from '../../captions/domain/CaptionDocument';
import type { TranslationBatchResult } from './TranslationBatch';
import type { TranslatedCue } from './TranslationCue';

export type TranslationCompletion = 'complete' | 'partial';

export interface TranslationDocument {
  readonly sessionId: string;
  readonly videoId: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly promptVersion: string;
  readonly source: CaptionDocument;
  readonly cues: readonly TranslatedCue[];
  readonly batchResults: readonly TranslationBatchResult[];
  readonly completion: TranslationCompletion;
  readonly translatedCueCount: number;
  readonly failedCueCount: number;
  readonly startedAt: number;
  readonly completedAt: number;
}
