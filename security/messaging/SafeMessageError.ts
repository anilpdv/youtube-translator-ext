export class SafeMessageError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'SafeMessageError';
  }
}
