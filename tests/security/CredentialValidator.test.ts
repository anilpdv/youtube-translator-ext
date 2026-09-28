import { describe, expect, it } from 'vitest';
import { CredentialValidator } from '../../security/credentials/CredentialValidator';

describe('CredentialValidator', () => {
  it('normalizes valid credentials without exposing them in errors', () => {
    const validator = new CredentialValidator(new Map([['gemini', { minimumLength: 5, maximumLength: 20 }]]));
    expect(validator.validate('gemini', '  secret-key  ')).toBe('secret-key');
    expect(() => validator.validate('gemini', 'bad')).toThrow('invalid length');
  });
});
