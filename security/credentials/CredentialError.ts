export type CredentialErrorCode =
  | 'CREDENTIAL_NOT_FOUND' | 'CREDENTIAL_INVALID' | 'CREDENTIAL_READ_FAILED'
  | 'CREDENTIAL_WRITE_FAILED' | 'CREDENTIAL_DELETE_FAILED'
  | 'CREDENTIAL_PROVIDER_UNSUPPORTED';

export class CredentialError extends Error {
  constructor(
    readonly code: CredentialErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CredentialError';
  }
}
