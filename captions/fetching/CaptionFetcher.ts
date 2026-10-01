import { CaptionError } from '../domain/CaptionError';
import type { CaptionLimits } from '../domain/CaptionLimits';
import type { CaptionTrack } from '../domain/CaptionTrack';
import type { CaptionResponse } from './CaptionResponse';
import { detectCaptionFormat } from './detectCaptionFormat';

export interface CaptionFetcherOptions {
  readonly timeoutMs: number;
  readonly limits: CaptionLimits;
}

interface CaptionProbeResult {
  readonly label: string;
  readonly status: number;
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly contentType: string | null;
  readonly contentLength: string | null;
  readonly bodyBytes: number;
  readonly request: Record<string, unknown>;
}

let diagnosticProbeCompleted = false;

const isTestRuntime =
  (import.meta.env as ImportMetaEnv & { MODE?: string }).MODE === 'test';

export class CaptionFetcher {
  constructor(private readonly options: CaptionFetcherOptions) {}

  async fetch(track: CaptionTrack, signal?: AbortSignal): Promise<CaptionResponse> {
    signal?.throwIfAborted();
    if (!isTestRuntime) {
      if (diagnosticProbeCompleted) {
        throw new Error('Caption diagnostic probe already completed for this page.');
      }
      diagnosticProbeCompleted = true;
    }
    const url = this.createCaptionUrl(track);
    console.info('[AI Subtitles][CaptionDebug] request', {
      trackId: track.id,
      languageCode: track.languageCode,
      kind: track.kind,
      isDefault: track.isDefault,
      formatHint: track.formatHint ?? null,
      url: describeCaptionUrl(url),
    });
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort('Caption request timed out.'),
      this.options.timeoutMs,
    );
    const combinedSignal = this.combineSignals(signal, timeoutController.signal);
    try {
      if (!isTestRuntime) {
        await runCaptionProbe(track, signal);
        throw new Error(
          'Caption diagnostic probe completed. Inspect CaptionProbe comparison logs.',
        );
      }
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        signal: combinedSignal,
      });
      console.info('[AI Subtitles][CaptionDebug] response headers', {
        trackId: track.id,
        status: response.status,
        ok: response.ok,
        redirected: response.redirected,
        responseUrl: describeResponseUrl(response.url),
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      });
      if (!response.ok) {
        throw new CaptionError({
          code: 'CAPTION_REQUEST_FAILED',
          message: `Caption request failed with status ${response.status}.`,
          retryable: response.status >= 500 || response.status === 429,
          details: { status: response.status },
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
          details: { declaredLength },
        });
      }
      const body = await response.text();
      signal?.throwIfAborted();
      const byteLength = new TextEncoder().encode(body).byteLength;
      console.info('[AI Subtitles][CaptionDebug] response body', {
        trackId: track.id,
        bodyBytes: byteLength,
        bodyPrefix: body.slice(0, 20).replace(/\s+/g, ' '),
      });
      if (byteLength > this.options.limits.maxResponseBytes) {
        throw new CaptionError({
          code: 'CAPTION_RESPONSE_TOO_LARGE',
          message: 'The caption response exceeds the allowed size.',
          details: { byteLength },
        });
      }
      if (!body.trim()) {
        console.warn('[AI Subtitles][CaptionDebug] empty response', {
          trackId: track.id,
          languageCode: track.languageCode,
          kind: track.kind,
          url: describeCaptionUrl(url),
        });
        throw new CaptionError({
          code: 'CAPTION_RESPONSE_EMPTY',
          message: 'YouTube returned an empty caption response.',
          retryable: true,
        });
      }
      const contentType = response.headers.get('content-type');
      return {
        body,
        contentType,
        byteLength,
        format: detectCaptionFormat({
          body,
          contentType,
          requestedFormat: track.formatHint,
        }),
      };
    } catch (error) {
      console.warn('[AI Subtitles][CaptionDebug] request failed', {
        trackId: track.id,
        code: error instanceof CaptionError ? error.code : 'UNKNOWN',
        message: error instanceof Error ? error.message : String(error),
      });
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

  private createCaptionUrl(track: CaptionTrack): URL {
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
    if (!track.formatHint) url.searchParams.set('fmt', 'json3');
    // Source extraction must never request YouTube auto-translation. The
    // legacy working helper removed tlang whenever it fetched the source URL.
    url.searchParams.delete('tlang');
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

async function runCaptionProbe(
  track: CaptionTrack,
  signal?: AbortSignal,
): Promise<void> {
  const candidates = [
    { label: 'untouched-base-url', url: new URL(track.baseUrl) },
    { label: 'current-caption-fetcher', url: createCurrentProbeUrl(track) },
    { label: 'json3-preserve-target', url: createLegacyJson3ProbeUrl(track) },
    { label: 'json3-without-target', url: createJson3WithoutTargetProbeUrl(track) },
  ];
  const results: CaptionProbeResult[] = [];
  for (const candidate of candidates) {
    try {
      results.push(await probeCaptionUrl(candidate.label, candidate.url, signal));
    } catch (error) {
      console.warn('[AI Subtitles][CaptionProbe] failed', {
        label: candidate.label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  console.warn('[AI Subtitles][CaptionProbe] comparison', results);
}

async function probeCaptionUrl(
  label: string,
  url: URL,
  signal?: AbortSignal,
): Promise<CaptionProbeResult> {
  const startedAt = performance.now();
  console.error('[AI Subtitles][CaptionProbe] starting', {
    label,
    request: describeCaptionUrl(url),
  });
  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    signal,
  });
  const body = await response.text();
  const result = {
    label,
    status: response.status,
    ok: response.ok,
    redirected: response.redirected,
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length'),
    bodyBytes: new TextEncoder().encode(body).byteLength,
    request: describeCaptionUrl(url),
  };
  console.error('[AI Subtitles][CaptionProbe] completed', {
    ...result,
    durationMs: Math.round(performance.now() - startedAt),
  });
  return result;
}

function createCurrentProbeUrl(track: CaptionTrack): URL {
  const url = new URL(track.baseUrl);
  if (!track.formatHint) url.searchParams.set('fmt', 'json3');
  url.searchParams.delete('tlang');
  return url;
}

function createLegacyJson3ProbeUrl(track: CaptionTrack): URL {
  const url = new URL(track.baseUrl);
  url.searchParams.set('fmt', 'json3');
  return url;
}

function createJson3WithoutTargetProbeUrl(track: CaptionTrack): URL {
  const url = new URL(track.baseUrl);
  url.searchParams.set('fmt', 'json3');
  url.searchParams.delete('tlang');
  return url;
}

function describeCaptionUrl(input: URL | string): Record<string, unknown> {
  const url = input instanceof URL ? input : new URL(input);
  return {
    origin: url.origin,
    pathname: url.pathname,
    language: url.searchParams.get('lang'),
    targetLanguage: url.searchParams.get('tlang'),
    format: url.searchParams.get('fmt'),
    kind: url.searchParams.get('kind'),
    hasSignature:
      url.searchParams.has('sig') ||
      url.searchParams.has('signature') ||
      url.searchParams.has('lsig'),
    hasExpire: url.searchParams.has('expire'),
    parameterNames: [...new Set(url.searchParams.keys())].sort(),
  };
}

function describeResponseUrl(input: string): Record<string, unknown> | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    return { origin: url.origin, pathname: url.pathname };
  } catch {
    return { origin: null, pathname: null };
  }
}
