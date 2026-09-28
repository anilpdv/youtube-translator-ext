import { CredentialError } from './CredentialError';

export interface CredentialValidationPolicy {
  readonly minimumLength: number;
  readonly maximumLength: number;
  readonly allowedPattern?: RegExp;
}

export class CredentialValidator {
  constructor(
    private readonly policies: ReadonlyMap<string, CredentialValidationPolicy>,
  ) {}

  validate(providerId: string, secret: string): string {
    const policy = this.policies.get(providerId);
    if (!policy) throw new CredentialError('CREDENTIAL_PROVIDER_UNSUPPORTED', 'The selected provider is not supported.');
    const normalized = secret.trim();
    if (normalized.length < policy.minimumLength || normalized.length > policy.maximumLength) {
      throw new CredentialError('CREDENTIAL_INVALID', 'The provider credential has an invalid length.');
    }
    if (policy.allowedPattern && !policy.allowedPattern.test(normalized)) {
      throw new CredentialError('CREDENTIAL_INVALID', 'The provider credential has an invalid format.');
    }
    return normalized;
  }
}
