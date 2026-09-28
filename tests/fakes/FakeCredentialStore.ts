import type { CredentialProviderId, ProviderCredential } from '../../security/credentials/Credential';
import type { CredentialStore } from '../../security/credentials/CredentialStore';

export class FakeCredentialStore implements CredentialStore {
  readonly credentials = new Map<CredentialProviderId, ProviderCredential>();
  async get(providerId: CredentialProviderId): Promise<ProviderCredential | null> { return this.credentials.get(providerId) ?? null; }
  async set(credential: ProviderCredential): Promise<void> { this.credentials.set(credential.providerId, credential); }
  async delete(providerId: CredentialProviderId): Promise<void> { this.credentials.delete(providerId); }
  async has(providerId: CredentialProviderId): Promise<boolean> { return this.credentials.has(providerId); }
  async clearAll(): Promise<void> { this.credentials.clear(); }
}
