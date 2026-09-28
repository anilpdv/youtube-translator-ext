export type ExportErrorCode = 'EXPORT_INVALID' | 'EXPORT_EMPTY' | 'EXPORT_DOWNLOAD_FAILED';

export class ExportError extends Error {
  constructor(readonly code: ExportErrorCode, message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ExportError';
  }
}
