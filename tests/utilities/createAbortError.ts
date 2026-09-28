export function createAbortError(message = 'Aborted'): DOMException {
  return new DOMException(message, 'AbortError');
}
