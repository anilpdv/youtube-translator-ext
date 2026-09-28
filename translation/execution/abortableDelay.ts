export function abortableDelay(
  durationMs: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const handleAbort = (): void => {
      clearTimeout(timeoutId);
      reject(new DOMException('Operation cancelled.', 'AbortError'));
    };
    const timeoutId = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, durationMs);
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}
