import { ApplicationError } from '../../app/ApplicationError';
import { CaptionError } from '../domain/CaptionError';

export function mapCaptionError(error: unknown): ApplicationError {
  if (!(error instanceof CaptionError)) {
    return new ApplicationError({
      code: 'CAPTION_EXTRACTION_FAILED',
      title: 'Captions could not be loaded',
      message: 'An unexpected error occurred while loading captions.',
      retryable: true,
      cause: error,
    });
  }
  if (
    error.code === 'NO_CAPTION_TRACKS' ||
    error.code === 'CAPTION_METADATA_NOT_FOUND'
  ) {
    return new ApplicationError({
      code: 'CAPTION_EXTRACTION_FAILED',
      title: 'No captions available',
      message: 'This video does not provide a supported caption track.',
      retryable: false,
      cause: error,
    });
  }
  if (error.code === 'SESSION_CANCELLED') {
    return new ApplicationError({
      code: 'SESSION_CANCELLED',
      title: 'Caption loading cancelled',
      message: 'Caption loading stopped because the active session changed.',
      cause: error,
    });
  }
  return new ApplicationError({
    code: 'CAPTION_EXTRACTION_FAILED',
    title: 'Captions could not be loaded',
    message: error.message,
    retryable: error.retryable,
    cause: error,
  });
}
