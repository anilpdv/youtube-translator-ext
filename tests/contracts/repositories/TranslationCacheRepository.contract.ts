import { describe, expect, it } from 'vitest';
import type { TranslationCacheRepository } from '../../../cache/repository/TranslationCacheRepository';
import { createCacheRecord } from '../../factories/createCacheRecord';

export function runCacheRepositoryContract(name: string, repository: TranslationCacheRepository): void {
  describe(`${name} cache repository contract`, () => {
    it('round trips and deletes records', async () => {
      const record = createCacheRecord();
      await repository.put(record);
      expect(await repository.get(record.id)).toEqual(record);
      await repository.delete(record.id);
      expect(await repository.get(record.id)).toBeNull();
    });
  });
}
