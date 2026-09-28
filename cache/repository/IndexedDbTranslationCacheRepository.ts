import type { CacheMetadata } from '../domain/CacheMetadata';
import { CacheError } from '../domain/CacheError';
import type { TranslationCacheRecord } from '../domain/TranslationCacheRecord';
import { migrateCacheRecord } from './CacheRecordMigrator';
import type { TranslationCacheRepository } from './TranslationCacheRepository';

const DB_NAME = 'youtube-ai-translator';
const STORE_NAME = 'translation-cache';
const VERSION = 1;

export class IndexedDbTranslationCacheRepository implements TranslationCacheRepository {
  private readonly memory = new Map<string, TranslationCacheRecord>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private open(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onerror = () => reject(new CacheError({
        code: 'CACHE_UNAVAILABLE', message: 'Translation cache is unavailable.', retryable: true,
        cause: request.error,
      }));
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
    });
    return this.dbPromise;
  }

  async get(id: string): Promise<TranslationCacheRecord | null> {
    const db = await this.open();
    if (!db) return this.memory.get(id) ?? null;
    return this.request<unknown>(db, 'readonly', (store) => store.get(id))
      .then((value) => migrateCacheRecord(value));
  }

  async put(record: TranslationCacheRecord): Promise<void> {
    const db = await this.open();
    if (!db) { this.memory.set(record.id, record); return; }
    await this.request(db, 'readwrite', (store) => store.put(record));
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    if (!db) { this.memory.delete(id); return; }
    await this.request(db, 'readwrite', (store) => store.delete(id));
  }

  async list(): Promise<readonly TranslationCacheRecord[]> {
    const db = await this.open();
    if (!db) return [...this.memory.values()];
    const values = await this.request<unknown[]>(db, 'readonly', (store) => store.getAll());
    return values.map(migrateCacheRecord).filter((value): value is TranslationCacheRecord => value !== null);
  }

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

  async clear(): Promise<void> {
    const db = await this.open();
    if (!db) { this.memory.clear(); return; }
    await this.request(db, 'readwrite', (store) => store.clear());
  }

  private request<T>(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      request.onerror = () => reject(new CacheError({
        code: mode === 'readonly' ? 'CACHE_READ_FAILED' : 'CACHE_WRITE_FAILED',
        message: 'Translation cache operation failed.', retryable: true, cause: request.error,
      }));
      request.onsuccess = () => resolve(request.result as T);
    });
  }
}
