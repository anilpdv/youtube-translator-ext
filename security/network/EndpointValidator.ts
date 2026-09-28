import { NetworkError } from './NetworkError';
import type { ProviderEndpointDefinition } from './ProviderEndpointPolicy';

export class EndpointValidator {
  validate(input: string | URL, definition: ProviderEndpointDefinition): URL {
    let url: URL;
    try { url = new URL(input.toString()); }
    catch { throw new NetworkError('INVALID_ENDPOINT', 'The provider endpoint is invalid.'); }
    if (url.origin !== new URL(definition.origin).origin) {
      throw new NetworkError('ENDPOINT_NOT_ALLOWED', 'The provider endpoint is not allowed.');
    }
    if (url.username || url.password) {
      throw new NetworkError('ENDPOINT_CREDENTIALS_NOT_ALLOWED', 'Credentials must not be embedded in the endpoint URL.');
    }
    if (!definition.allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
      throw new NetworkError('ENDPOINT_PATH_NOT_ALLOWED', 'The provider endpoint path is not allowed.');
    }
    return url;
  }
}
