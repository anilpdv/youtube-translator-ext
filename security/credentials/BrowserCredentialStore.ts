import type { CredentialProviderId, ProviderCredential } from './Credential';
import { CredentialError } from './CredentialError';
import type { CredentialStore } from './CredentialStore';

const PREFIX = 'provider-credential:';

export class BrowserCredentialStore implements CredentialStore {
  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'> =
      typeof localStorage === 'undefined' ? createMemoryStorage() : localStorage,
  ) {}

  async get(providerId: CredentialProviderId): Promise<ProviderCredential | null> {
    try {
      const value = this.storage.getItem(`${PREFIX}${providerId}`);
      if (!value) return null;
      const parsed: unknown = JSON.parse(value);
      if (!isCredential(parsed, providerId)) throw new Error('Invalid credential record');
      return parsed;
    } catch (error) {
      if (error instanceof CredentialError) throw error;
      throw new CredentialError('CREDENTIAL_READ_FAILED', 'The provider credential could not be read.', error);
    }

  }

  async set(credential: ProviderCredential): Promise<void> {
    try {
      this.storage.setItem(`${PREFIX}${credential.providerId}`, JSON.stringify(credential));
    } catch (error) {
      throw new CredentialError('CREDENTIAL_WRITE_FAILED', 'The provider credential could not be saved.', error);
    }
  }

  async delete(providerId: CredentialProviderId): Promise<void> {
    try { this.storage.removeItem(`${PREFIX}${providerId}`); }
    catch (error) { throw new CredentialError('CREDENTIAL_DELETE_FAILED', 'The provider credential could not be removed.', error); }
  }

  async has(providerId: CredentialProviderId): Promise<boolean> { return (await this.get(providerId)) !== null; }

  async clearAll(): Promise<void> {
    for (const provider of ['gemini'] as const) await this.delete(provider);
  }
}

function isCredential(value: unknown, providerId: CredentialProviderId): value is ProviderCredential {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProviderCredential>;
  return candidate.providerId === providerId && typeof candidate.secret === 'string' &&
    typeof candidate.version === 'number' && typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number';
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  } as Storage;
}
