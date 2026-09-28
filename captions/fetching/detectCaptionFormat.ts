import type { CaptionFormat } from '../domain/CaptionFormat';

export function detectCaptionFormat(input: {
  readonly body: string;
  readonly contentType?: string | null;
  readonly requestedFormat?: string | null;
}): CaptionFormat {
  const contentType = input.contentType?.toLowerCase() ?? '';
  const trimmed = input.body.trimStart();
  if (input.requestedFormat === 'json3' || contentType.includes('application/json')) return 'json3';
  if (
    input.requestedFormat === 'vtt' ||
    contentType.includes('text/vtt') ||
    trimmed.startsWith('WEBVTT')
  ) return 'webvtt';
  if (
    input.requestedFormat === 'srv3' ||
    trimmed.startsWith('<?xml') ||
    trimmed.startsWith('<transcript')
  ) return 'srv3';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json3';
  return 'unknown';
}
