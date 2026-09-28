import { redactObject } from '../redaction/SecretRedactor';

export function sanitizeDiagnostics(value: unknown): unknown {
  return redactObject(value);
}
