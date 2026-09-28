import { describe, expect, it } from 'vitest';
import { sanitizeDiagnosticBundle } from '../../observability/diagnostics/DiagnosticSanitizer';
describe('sanitizeDiagnosticBundle', () => {
  it('blocks forbidden fields after redaction', () => {
    expect(() => sanitizeDiagnosticBundle({ sourceText: 'private' })).toThrow();
    expect(sanitizeDiagnosticBundle({ count: 2 })).toEqual({ count: 2 });
  });
});
