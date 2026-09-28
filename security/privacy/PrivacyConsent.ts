export interface PrivacyConsent {
  readonly providerId: string;
  readonly accepted: boolean;
  readonly policyVersion: string;
  readonly acceptedAt: number | null;
}

export const PRIVACY_POLICY_VERSION = '1';
