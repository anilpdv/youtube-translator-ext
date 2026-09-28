export type CaptionErrorCode =
  | 'UNSUPPORTED_PAGE'
  | 'VIDEO_NOT_FOUND'
  | 'PLAYER_DATA_NOT_FOUND'
  | 'CAPTION_METADATA_NOT_FOUND'
  | 'NO_CAPTION_TRACKS'
  | 'TRACK_NOT_FOUND'
  | 'INVALID_TRACK_URL'
  | 'CAPTION_REQUEST_FAILED'
  | 'CAPTION_REQUEST_TIMEOUT'
  | 'CAPTION_RESPONSE_EMPTY'
  | 'CAPTION_RESPONSE_TOO_LARGE'
  | 'CAPTION_FORMAT_UNKNOWN'
  | 'CAPTION_FORMAT_UNSUPPORTED'
  | 'CAPTION_PARSE_FAILED'
  | 'CAPTION_VALIDATION_FAILED'
  | 'CAPTION_LIMIT_EXCEEDED'
  | 'SESSION_CANCELLED';

export interface CaptionErrorOptions {
  code: CaptionErrorCode;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class CaptionError extends Error {
  readonly code: CaptionErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(options: CaptionErrorOptions) {
    super(options.message);
    this.name = 'CaptionError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
    this.cause = options.cause;
  }
}
