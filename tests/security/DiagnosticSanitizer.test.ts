import { describe, expect, it } from 'vitest';
import { sanitizeDiagnostics } from '../../security/diagnostics/DiagnosticSanitizer';

describe('sanitizeDiagnostics', () => {
  it('keeps credentials out of diagnostics', () => {
    expect(sanitizeDiagnostics({ model: 'gemini', token: 'secret', caption: 'hello' }))
      .toEqual({ model: 'gemini', token: '[REDACTED]', caption: 'hello' });
  });
});
