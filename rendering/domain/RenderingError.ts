export type RenderingErrorCode =
  | 'PLAYER_NOT_FOUND'
  | 'VIDEO_ELEMENT_NOT_FOUND'
  | 'OVERLAY_MOUNT_FAILED'
  | 'OVERLAY_DISPOSED'
  | 'TRACK_VIDEO_MISMATCH'
  | 'INVALID_RENDER_TRACK'
  | 'PLAYER_REPLACED'
  | 'SESSION_CANCELLED';

export interface RenderingErrorOptions {
  readonly code: RenderingErrorCode;
  readonly message: string;
  readonly retryable?: boolean;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;
}

export class RenderingError extends Error {
  readonly code: RenderingErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(options: RenderingErrorOptions) {
    super(options.message);
    this.name = 'RenderingError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
    this.cause = options.cause;
  }
}
