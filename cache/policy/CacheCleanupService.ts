import type { CacheLimits } from '../domain/CacheLimits';
import { recordsToRemove } from './CacheRetentionPolicy';
import type { TranslationCacheRepository } from '../repository/TranslationCacheRepository';

export class CacheCleanupService {
  constructor(
    private readonly repository: TranslationCacheRepository,
    private readonly limits: CacheLimits,
  ) {}

  async cleanup(now = Date.now()): Promise<number> {
    const records = await this.repository.list();
    const removable = recordsToRemove(records, this.limits, now);
    await Promise.all(removable.map((record) => this.repository.delete(record.id)));
    return removable.length;
  }
}
