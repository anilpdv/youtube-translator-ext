export type ApplicationErrorCode =
  | 'INVALID_STATE_TRANSITION'
  | 'SESSION_NOT_ACTIVE'
  | 'SESSION_CANCELLED'
  | 'VIDEO_CHANGED'
  | 'VIDEO_NOT_FOUND'
  | 'USER_ACTION_REQUIRED'
  | 'TRANSLATION_ALREADY_RUNNING'
  | 'CAPTIONS_NOT_FOUND'
  | 'PLAYER_NOT_FOUND'
  | 'CAPTION_DISCOVERY_FAILED'
  | 'CAPTION_EXTRACTION_FAILED'
  | 'TRANSLATION_FAILED'
  | 'TRANSLATION_TIMEOUT'
  | 'INVALID_TRANSLATION_RESPONSE'
  | 'RENDERING_FAILED'
  | 'EXPORT_FAILED'
  | 'STORAGE_FAILED'
  | 'UNKNOWN_ERROR';

export interface ApplicationErrorOptions {
  code: ApplicationErrorCode;
  title: string;
  message: string;
  retryable?: boolean;
  technicalDetails?: string;
  cause?: unknown;
}

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly title: string;
  readonly retryable: boolean;
  readonly technicalDetails?: string;
  readonly cause?: unknown;

  constructor(options: ApplicationErrorOptions) {
    super(options.message);
    this.name = 'ApplicationError';
    this.code = options.code;
    this.title = options.title;
    this.retryable = options.retryable ?? false;
    this.technicalDetails = options.technicalDetails;
    this.cause = options.cause;
  }
}

export function toApplicationError(
  error: unknown,
  fallback: Omit<ApplicationErrorOptions, 'cause'>,
): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  return new ApplicationError({
    ...fallback,
    cause: error,
    technicalDetails:
      error instanceof Error ? error.message : 'An unknown error occurred.',
  });
}
