import type { TranslatedCue } from '../domain/TranslationCue';

export interface TranslationValidationReport {
  readonly valid: boolean;
  readonly translations: readonly TranslatedCue[];
  readonly missingCueIds: readonly string[];
  readonly duplicateCueIds: readonly string[];
  readonly unknownCueIds: readonly string[];
  readonly errors: readonly string[];
}
