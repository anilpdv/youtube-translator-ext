export interface TranslationLimits {
  readonly maxCuesPerBatch: number;
  readonly maxCharactersPerBatch: number;
  readonly maxEstimatedTokensPerBatch: number;
  readonly maxConcurrentBatches: number;
  readonly maxAttemptsPerBatch: number;
  readonly requestTimeoutMs: number;
  readonly maxResponseBytes: number;
  readonly maxTranslatedCueLength: number;
}

export const DEFAULT_TRANSLATION_LIMITS: TranslationLimits = {
  maxCuesPerBatch: 40,
  maxCharactersPerBatch: 8_000,
  maxEstimatedTokensPerBatch: 3_000,
  maxConcurrentBatches: 2,
  maxAttemptsPerBatch: 3,
  requestTimeoutMs: 45_000,
  maxResponseBytes: 2 * 1024 * 1024,
  maxTranslatedCueLength: 4_000,
};
