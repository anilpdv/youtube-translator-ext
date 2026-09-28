import { redactObject } from '../../security/redaction/SecretRedactor';
const forbidden = /apiKey|authorization|secret|credential|sourceText|translatedText|captionText|prompt|rawResponse|baseUrl|cookie/i;
export function sanitizeDiagnosticBundle<T>(bundle: T): T {
  const sanitized = redactObject(bundle) as T;
  if (forbidden.test(JSON.stringify(sanitized))) throw new Error('Diagnostic bundle contains forbidden fields.');
  return sanitized;
}
