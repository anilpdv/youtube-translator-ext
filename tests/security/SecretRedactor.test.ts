import { describe, expect, it } from 'vitest';
import { redactObject } from '../../security/redaction/SecretRedactor';

describe('redactObject', () => {
  it('removes secret-shaped fields recursively', () => {
    expect(redactObject({ apiKey: 'secret', nested: { authorization: 'Bearer secret' } }))
      .toEqual({ apiKey: '[REDACTED]', nested: { authorization: '[REDACTED]' } });
  });
});
