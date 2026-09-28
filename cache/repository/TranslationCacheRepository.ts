import type { CacheMetadata } from '../domain/CacheMetadata';
import type { TranslationCacheRecord } from '../domain/TranslationCacheRecord';

export interface TranslationCacheRepository {
  get(id: string): Promise<TranslationCacheRecord | null>;
  put(record: TranslationCacheRecord): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<readonly TranslationCacheRecord[]>;
  metadata(): Promise<CacheMetadata>;
  clear(): Promise<void>;
}
