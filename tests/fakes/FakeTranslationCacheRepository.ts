import type { CacheMetadata } from '../../cache/domain/CacheMetadata';
import type { TranslationCacheRecord } from '../../cache/domain/TranslationCacheRecord';
import type { TranslationCacheRepository } from '../../cache/repository/TranslationCacheRepository';

export class FakeTranslationCacheRepository implements TranslationCacheRepository {
  readonly records = new Map<string, TranslationCacheRecord>();
  async get(id: string): Promise<TranslationCacheRecord | null> { return this.records.get(id) ?? null; }
  async put(record: TranslationCacheRecord): Promise<void> { this.records.set(record.id, record); }
  async delete(id: string): Promise<void> { this.records.delete(id); }
  async list(): Promise<readonly TranslationCacheRecord[]> { return [...this.records.values()]; }
  async metadata(): Promise<CacheMetadata> {
    const records = await this.list();
    return {
      recordCount: records.length,
      approximateSizeBytes: records.reduce((sum, record) => sum + record.approximateSizeBytes, 0),
      oldestRecordAt: records.length ? Math.min(...records.map((record) => record.createdAt)) : null,
      newestRecordAt: records.length ? Math.max(...records.map((record) => record.createdAt)) : null,
      lastCleanupAt: null,
    };
  }
  async clear(): Promise<void> { this.records.clear(); }
}
