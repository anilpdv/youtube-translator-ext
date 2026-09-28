import { redactObject } from './SecretRedactor';

export function redactHeaders(headers: HeadersInit): Record<string, string> {
  return redactObject(Object.fromEntries(new Headers(headers).entries())) as Record<string, string>;
}
