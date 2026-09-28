import type { DiagnosticBundle } from './DiagnosticBundle';
import { sanitizeDiagnostics } from './DiagnosticSanitizer';

export function createDiagnosticBundle(
  appVersion: string,
  details: Readonly<Record<string, unknown>>,
): DiagnosticBundle {
  return { version: 1, generatedAt: Date.now(), appVersion, details: sanitizeDiagnostics(details) as Readonly<Record<string, unknown>> };
}
