import type { CredentialStore } from '../credentials/CredentialStore';
import type { TranslationCacheRepository } from '../../cache/repository/TranslationCacheRepository';

export class DataDeletionService {
  constructor(
    private readonly credentials: CredentialStore,
    private readonly cache: TranslationCacheRepository,
  ) {}

  async deleteAllLocalData(): Promise<void> {
    await Promise.all([this.credentials.clearAll(), this.cache.clear()]);
  }
}
