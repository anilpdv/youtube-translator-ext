export interface TranslationSessionOptions {
  id?: string;
  videoId: string;
  captionTrackId?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  providerId: string;
  modelId?: string;
}

function createSessionId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class TranslationSession {
  readonly id: string;
  readonly videoId: string;
  readonly captionTrackId?: string;
  readonly sourceLanguage?: string;
  readonly targetLanguage: string;
  readonly providerId: string;
  readonly modelId?: string;
  readonly startedAt: number;

  private readonly abortController = new AbortController();
  private endedAt: number | null = null;

  constructor(options: TranslationSessionOptions) {
    this.id = options.id ?? createSessionId();
    this.videoId = options.videoId;
    this.captionTrackId = options.captionTrackId;
    this.sourceLanguage = options.sourceLanguage;
    this.targetLanguage = options.targetLanguage;
    this.providerId = options.providerId;
    this.modelId = options.modelId;
    this.startedAt = Date.now();
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  get isActive(): boolean {
    return !this.signal.aborted && this.endedAt === null;
  }

  get finishedAt(): number | null {
    return this.endedAt;
  }

  cancel(reason = 'Translation session cancelled'): void {
    if (!this.isActive) return;
    this.endedAt = Date.now();
    this.abortController.abort(reason);
  }

  finish(): void {
    if (this.endedAt === null) {
      this.endedAt = Date.now();
    }
  }

  throwIfInactive(): void {
    if (!this.isActive) {
      throw new DOMException(
        'Translation session is no longer active.',
        'AbortError',
      );
    }
  }
}
