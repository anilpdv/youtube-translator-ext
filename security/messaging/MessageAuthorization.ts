import type { SenderRole } from './SenderValidator';

const ALLOWED: Readonly<Record<SenderRole, readonly string[]>> = {
  content: ['provider.translate', 'application.get-state', 'application.start-translation'],
  popup: ['application.get-state', 'application.start-translation', 'application.clear-translation', 'credential.set', 'credential.delete'],
  background: [],
};

export function isMessageAuthorized(role: SenderRole, type: string): boolean {
  return ALLOWED[role].includes(type);
}
