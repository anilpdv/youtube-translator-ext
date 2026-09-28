const SECRET_KEYS = /(?:api[-_]?key|authorization|token|secret|password|credential)/i;

export function redactSecret(value: string): string {
  return value.length ? '[REDACTED]' : value;
}

export function redactObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key, SECRET_KEYS.test(key) ? '[REDACTED]' : redactObject(entry),
  ]));
}
