import type { RequestPolicy } from './RequestPolicy';
import { NetworkError } from './NetworkError';
import { readLimitedResponse } from './ResponseSizeLimiter';
import { validateRedirect } from './RedirectPolicy';

export interface SafeFetchRequest {
  readonly url: URL;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly signal: AbortSignal;
  readonly policy: RequestPolicy;
}

export interface SafeFetchResponse {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Headers;
  readonly body: string;
  readonly byteLength: number;
}

export class SafeFetch {
  async execute(request: SafeFetchRequest): Promise<SafeFetchResponse> {
    const method = request.method.toUpperCase();
    if (!request.policy.allowedMethods.includes(method)) throw new NetworkError('METHOD_NOT_ALLOWED', 'The request method is not allowed.');
    if (!request.policy.allowedOrigins.includes(request.url.origin)) throw new NetworkError('ENDPOINT_NOT_ALLOWED', 'The request origin is not allowed.');
    const bodyBytes = request.body ? new TextEncoder().encode(request.body).byteLength : 0;
    if (bodyBytes > request.policy.maxRequestBytes) throw new NetworkError('REQUEST_TOO_LARGE', 'The provider request exceeds the configured limit.');
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), request.policy.timeoutMs);
    try {
      const signal = typeof AbortSignal.any === 'function'
        ? AbortSignal.any([request.signal, timeout.signal]) : timeout.signal;
      const response = await fetch(request.url, {
        method, headers: request.headers, body: request.body, signal,
        redirect: request.policy.allowRedirects ? 'follow' : 'error',
      });
      validateRedirect(response, request.policy.allowRedirects);
      const body = await readLimitedResponse(response, request.policy.maxResponseBytes);
      return { status: response.status, ok: response.ok, headers: response.headers, body, byteLength: new TextEncoder().encode(body).byteLength };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      if (timeout.signal.aborted) throw new NetworkError('REQUEST_TIMEOUT', 'The provider request timed out.', error);
      throw new NetworkError('NETWORK_REQUEST_FAILED', 'The provider request failed.', error);
    } finally { clearTimeout(timer); }
  }
}
