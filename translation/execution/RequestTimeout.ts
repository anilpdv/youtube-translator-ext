export function createTimeoutSignal(
  parentSignal: AbortSignal,
  timeoutMs: number,
): {
  signal: AbortSignal;
  dispose(): void;
  timedOut(): boolean;
} {
  const controller = new AbortController();
  let didTimeOut = false;
  const timeoutId = setTimeout(() => {
    didTimeOut = true;
    controller.abort('Translation request timed out.');
  }, timeoutMs);
  const handleAbort = (): void => controller.abort(parentSignal.reason);
  parentSignal.addEventListener('abort', handleAbort, { once: true });
  return {
    signal:
      typeof AbortSignal.any === 'function'
        ? AbortSignal.any([parentSignal, controller.signal])
        : controller.signal,
    dispose(): void {
      clearTimeout(timeoutId);
      parentSignal.removeEventListener('abort', handleAbort);
    },
    timedOut: () => didTimeOut,
  };
}
