import { redactObject } from './SecretRedactor';

export interface SafeError {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
}

export function serializeSafeError(error: unknown): SafeError {
  if (error instanceof Error) {
    const safe = redactObject({ name: error.name, message: error.message, code: 'code' in error ? error.code : undefined }) as SafeError;
    return safe;
  }
  return { name: 'Error', message: 'An unexpected error occurred.' };
}
