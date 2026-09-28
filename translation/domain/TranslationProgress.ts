export interface TranslationProgress {
  readonly sessionId: string;
  readonly completedBatches: number;
  readonly failedBatches: number;
  readonly totalBatches: number;
  readonly translatedCues: number;
  readonly failedCues: number;
  readonly totalCues: number;
  readonly activeBatchIds: readonly string[];
  readonly currentAttempt?: number;
}

export type TranslationProgressListener = (
  progress: TranslationProgress,
) => void;
