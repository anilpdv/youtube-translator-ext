import { TranslationError } from '../domain/TranslationError';
import type { ProviderTranslationItem } from '../providers/ProviderResponse';

export class TranslationResponseParser {
  parse(rawText: string): readonly ProviderTranslationItem[] {
    const clean = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(clean);
    } catch (cause) {
      throw new TranslationError({
        code: 'MALFORMED_RESPONSE',
        message: 'The translation provider returned invalid JSON.',
        retryable: true,
        cause,
      });
    }
    if (!Array.isArray(parsed)) {
      throw new TranslationError({
        code: 'MALFORMED_RESPONSE',
        message: 'The translation response is not an array.',
        retryable: true,
      });
    }
    return parsed.map((value, index) => {
      if (
        typeof value !== 'object' ||
        value === null ||
        typeof (value as { id?: unknown }).id !== 'string' ||
        typeof (value as { translation?: unknown }).translation !== 'string'
      ) {
        throw new TranslationError({
          code: 'MALFORMED_RESPONSE',
          message: `Translation item ${index} is missing required fields.`,
          retryable: true,
        });
      }
      return {
        id: (value as { id: string }).id,
        translation: (value as { translation: string }).translation,
      };
    });
  }
}
