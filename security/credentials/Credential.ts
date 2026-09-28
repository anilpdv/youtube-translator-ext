export type CredentialProviderId = 'gemini';

export interface ProviderCredential {
  readonly providerId: CredentialProviderId;
  readonly secret: string;
  readonly version: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface CredentialSummary {
  readonly providerId: CredentialProviderId;
  readonly configured: boolean;
  readonly updatedAt: number | null;
}
