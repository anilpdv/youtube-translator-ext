export type NetworkErrorCode =
  | 'INVALID_ENDPOINT' | 'ENDPOINT_NOT_ALLOWED' | 'ENDPOINT_PATH_NOT_ALLOWED'
  | 'ENDPOINT_CREDENTIALS_NOT_ALLOWED' | 'METHOD_NOT_ALLOWED' | 'MODEL_NOT_ALLOWED'
  | 'REQUEST_TOO_LARGE' | 'RESPONSE_TOO_LARGE' | 'REQUEST_TIMEOUT'
  | 'REDIRECT_NOT_ALLOWED' | 'NETWORK_REQUEST_FAILED';

export class NetworkError extends Error {
  constructor(readonly code: NetworkErrorCode, message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}
