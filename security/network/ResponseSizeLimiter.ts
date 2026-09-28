import { NetworkError } from './NetworkError';

export async function readLimitedResponse(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new NetworkError('RESPONSE_TOO_LARGE', 'The provider response exceeds the configured limit.');
  }
  const body = await response.text();
  const bytes = new TextEncoder().encode(body).byteLength;
  if (bytes > maxBytes) throw new NetworkError('RESPONSE_TOO_LARGE', 'The provider response exceeds the configured limit.');
  return body;
}
