import { NetworkError } from './NetworkError';

export function validateRedirect(response: Response, allowRedirects: boolean): void {
  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
    if (!allowRedirects) throw new NetworkError('REDIRECT_NOT_ALLOWED', 'Provider redirects are not allowed.');
  }
}
