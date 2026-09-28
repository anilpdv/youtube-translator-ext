import type { CredentialProviderId, ProviderCredential } from './Credential';

export interface CredentialStore {
  get(providerId: CredentialProviderId): Promise<ProviderCredential | null>;
  set(credential: ProviderCredential): Promise<void>;
  delete(providerId: CredentialProviderId): Promise<void>;
  has(providerId: CredentialProviderId): Promise<boolean>;
  clearAll(): Promise<void>;
}
