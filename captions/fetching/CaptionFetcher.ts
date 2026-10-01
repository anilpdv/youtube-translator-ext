import { CaptionError } from '../domain/CaptionError';
import type { CaptionLimits } from '../domain/CaptionLimits';
import type { CaptionTrack } from '../domain/CaptionTrack';
import type { CaptionResponse } from './CaptionResponse';
import { detectCaptionFormat } from './detectCaptionFormat';

export interface CaptionFetcherOptions {
  readonly timeoutMs: number;
  readonly limits: CaptionLimits;
}

export class CaptionFetcher {
  constructor(private readonly options: CaptionFetcherOptions) {}

  async fetch(track: CaptionTrack, signal?: AbortSignal): Promise<CaptionResponse> {
    signal?.throwIfAborted();
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort('Caption request timed out.'),
      this.options.timeoutMs,
    );
    const combinedSignal = this.combineSignals(signal, timeoutController.signal);
    try {
      let lastEmpty: CaptionError | null = null;
      for (const format of this.formatCandidates(track)) {
        const url = this.createCaptionUrl(track, format);
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          signal: combinedSignal,
        });
        if (!response.ok) {
          throw new CaptionError({
            code: 'CAPTION_REQUEST_FAILED',
            message: `Caption request failed with status ${response.status}.`,
            retryable: response.status >= 500 || response.status === 429,
            details: { status: response.status, format },
          });
        }
        const declaredLength = Number(response.headers.get('content-length'));
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > this.options.limits.maxResponseBytes
        ) {
          throw new CaptionError({
            code: 'CAPTION_RESPONSE_TOO_LARGE',
            message: 'The caption response exceeds the allowed size.',
            details: { declaredLength, format },
          });
        }
        const body = await response.text();
        signal?.throwIfAborted();
        const byteLength = new TextEncoder().encode(body).byteLength;
        if (byteLength > this.options.limits.maxResponseBytes) {
          throw new CaptionError({
            code: 'CAPTION_RESPONSE_TOO_LARGE',
            message: 'The caption response exceeds the allowed size.',
            details: { byteLength, format },
          });
        }
        if (!body.trim()) {
          lastEmpty = new CaptionError({
            code: 'CAPTION_RESPONSE_EMPTY',
            message: 'YouTube returned an empty caption response.',
            retryable: true,
            details: { format },
          });
          continue;
        }
        const contentType = response.headers.get('content-type');
        return {
          body,
          contentType,
          byteLength,
          format: detectCaptionFormat({
            body,
            contentType,
            requestedFormat: format,
          }),
        };
      }
      throw lastEmpty ?? new CaptionError({
        code: 'CAPTION_RESPONSE_EMPTY',
        message: 'YouTube returned an empty caption response.',
        retryable: true,
      });
    } catch (error) {
      if (error instanceof CaptionError) throw error;
      if (signal?.aborted) {
        throw new CaptionError({
          code: 'SESSION_CANCELLED',
          message: 'Caption loading was cancelled.',
          cause: error,
        });
      }
      if (timeoutController.signal.aborted) {
        throw new CaptionError({
          code: 'CAPTION_REQUEST_TIMEOUT',
          message: 'The caption request timed out.',
          retryable: true,
          cause: error,
        });
      }
      throw new CaptionError({
        code: 'CAPTION_REQUEST_FAILED',
        message: 'The caption track could not be downloaded.',
        retryable: true,
        cause: error,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private formatCandidates(track: CaptionTrack): readonly string[] {
    const preferred = track.formatHint ?? 'json3';
    return [...new Set([preferred, 'json3', 'srv3', 'webvtt'])];
  }

  private createCaptionUrl(track: CaptionTrack, format: string): URL {
    let url: URL;
    try {
      url = new URL(track.baseUrl);
    } catch {
      throw new CaptionError({
        code: 'INVALID_TRACK_URL',
        message: 'The caption track contains an invalid URL.',
      });
    }
    if (
      url.protocol !== 'https:' ||
      !(
        url.hostname === 'youtube.com' ||
        url.hostname.endsWith('.youtube.com') ||
        url.hostname === 'googlevideo.com' ||
        url.hostname.endsWith('.googlevideo.com')
      )
    ) {
      throw new CaptionError({
        code: 'INVALID_TRACK_URL',
        message: 'The caption track URL is not trusted.',
        details: { protocol: url.protocol, hostname: url.hostname },
      });
    }
    // YouTube calls WebVTT "vtt" in timed-text URLs, while the domain model
    // uses "webvtt" for the parsed format.
    url.searchParams.set('fmt', format === 'webvtt' ? 'vtt' : format);
    return url;
  }

  private combineSignals(first?: AbortSignal, second?: AbortSignal): AbortSignal {
    const signals = [first, second].filter(
      (value): value is AbortSignal => value !== undefined,
    );
    if (signals.length === 1) return signals[0];
    if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        break;
      }
      signal.addEventListener(
        'abort',
        () => controller.abort(signal.reason),
        { once: true },
      );
    }
    return controller.signal;
  }
}
