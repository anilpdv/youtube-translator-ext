import type { PopupRuntimeClient } from '../messaging/PopupRuntimeClient';
import type { PopupState } from './PopupState';

export type PopupStateListener = (state: PopupState) => void;

export class PopupController {
  private state: PopupState | null = null;
  private readonly listeners = new Set<PopupStateListener>();
  private disposed = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly runtime: PopupRuntimeClient) {}

  async start(): Promise<void> { await this.refresh(); }

  subscribe(listener: PopupStateListener): () => void {
    this.listeners.add(listener);
    if (this.state) listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async refresh(): Promise<void> {
    if (this.disposed) return;
    try {
      this.setState(await this.runtime.getState());
      this.scheduleRefresh();
    } catch {
      this.setState({
        runtimeAvailable: false,
        sessionId: null,
        status: 'unavailable',
        video: { supported: false, videoId: null, title: null, url: null },
        captionTracks: [],
        selectedCaptionTrackId: null,
        targetLanguage: '',
        providerId: '',
        modelId: '',
        providerReady: false,
        providerMessage: 'The content runtime is unavailable.',
        progress: { completedBatches: 0, failedBatches: 0, totalBatches: 0, completedCues: 0, failedCues: 0, totalCues: 0 },
        translationAvailable: false,
        failedBatchIds: [],
        subtitlesEnabled: false,
        subtitleDisplay: {
          mode: 'bilingual', fontScale: 1, backgroundOpacity: 0.72, textOpacity: 1,
          verticalPosition: 'bottom', syncOffsetMs: 0, showDuringPause: true,
        },
        message: 'Open a YouTube video to begin.',
        error: null,
      });
    }
  }

  async discoverTracks(): Promise<void> { this.setState(await this.runtime.discoverTracks()); }
  async startTranslation(input: Parameters<PopupRuntimeClient['startTranslation']>[0]): Promise<void> {
    this.setState(await this.runtime.startTranslation(input));
    await this.refresh();
  }
  async cancelTranslation(): Promise<void> {
    if (this.state?.sessionId) this.setState(await this.runtime.cancelTranslation(this.state.sessionId));
  }
  async retryFailedBatches(): Promise<void> {
    if (this.state?.sessionId) this.setState(await this.runtime.retryFailedBatches(this.state.sessionId, this.state.failedBatchIds));
  }
  dispose(): void {
    this.disposed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.listeners.clear();
  }
  private setState(state: PopupState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
  private scheduleRefresh(): void {
    if (this.state?.status === 'translating' || this.state?.status === 'loading-captions' || this.state?.status === 'discovering-tracks') {
      this.pollTimer = setTimeout(() => void this.refresh(), 750);
    }
  }
}
