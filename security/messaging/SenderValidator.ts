export type SenderRole = 'background' | 'popup' | 'content';

export interface MessageSenderLike {
  readonly id?: string;
  readonly tab?: { readonly id?: number; readonly url?: string };
}

export class SenderValidator {
  constructor(private readonly extensionId: string) {}

  role(sender: MessageSenderLike, expected: SenderRole): boolean {
    if (sender.id && sender.id !== this.extensionId) return false;
    if (expected === 'content') return typeof sender.tab?.id === 'number';
    if (expected === 'popup') return !sender.tab;
    return true;
  }
}
