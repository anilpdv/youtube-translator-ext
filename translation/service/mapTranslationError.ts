import { ApplicationError } from '../../app/ApplicationError';
import { TranslationError } from '../domain/TranslationError';

export function mapTranslationError(error: unknown): ApplicationError {
  if (!(error instanceof TranslationError)) {
    return new ApplicationError({
      code: 'TRANSLATION_FAILED',
      title: 'Translation failed',
      message: 'An unexpected translation error occurred.',
      retryable: true,
      cause: error,
    });
  }
  if (error.code === 'INVALID_CREDENTIALS') {
    return new ApplicationError({
      code: 'TRANSLATION_FAILED',
      title: 'Provider key is invalid',
      message: 'Check the configured API key and try again.',
      cause: error,
    });
  }
  if (error.code === 'SESSION_CANCELLED') {
    return new ApplicationError({
      code: 'SESSION_CANCELLED',
      title: 'Translation cancelled',
      message: 'The translation session was cancelled.',
      cause: error,
    });
  }
  if (
    error.code === 'MALFORMED_RESPONSE' ||
    error.code === 'MISSING_CUE' ||
    error.code === 'DUPLICATE_CUE' ||
    error.code === 'UNKNOWN_CUE' ||
    error.code === 'EMPTY_TRANSLATION'
  ) {
    return new ApplicationError({
      code: 'INVALID_TRANSLATION_RESPONSE',
      title: 'Invalid provider response',
      message: 'The provider returned an incomplete or invalid translation.',
      retryable: true,
      cause: error,
    });
  }
  return new ApplicationError({
    code: 'TRANSLATION_FAILED',
    title: 'Translation failed',
    message: error.message,
    retryable: error.retryable,
    cause: error,
  });
}
