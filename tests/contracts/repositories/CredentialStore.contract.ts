import { describe, expect, it } from 'vitest';
import type { CredentialStore } from '../../../security/credentials/CredentialStore';

export function runCredentialStoreContract(name: string, store: CredentialStore): void {
  describe(`${name} credential store contract`, () => {
    it('stores and removes credentials without changing provider identity', async () => {
      const credential = { providerId: 'gemini' as const, secret: 'test-secret', version: 1, createdAt: 0, updatedAt: 0 };
      await store.set(credential);
      expect(await store.get('gemini')).toEqual(credential);
      expect(await store.has('gemini')).toBe(true);
      await store.delete('gemini');
      expect(await store.has('gemini')).toBe(false);
    });
  });
}
