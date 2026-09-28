export function redactUrl(input: string | URL): string {
  const url = new URL(input.toString());
  for (const key of [...url.searchParams.keys()]) {
    if (/key|token|secret|auth/i.test(key)) url.searchParams.set(key, '[REDACTED]');
  }
  if (url.username || url.password) { url.username = '[REDACTED]'; url.password = ''; }
  return url.toString();
}
