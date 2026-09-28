import type { ApplicationMessage } from '../../background/messages/ApplicationMessages';
import type { PopupState } from '../app/PopupState';

export interface RuntimeResponse<T> {
  readonly ok: boolean;
  readonly data?: T;
  readonly error?: { readonly code: string; readonly message: string };
}

export class PopupRuntimeClient {
  async getState(): Promise<PopupState> {
    return this.send({ type: 'application.get-state' });
  }

  async discoverTracks(): Promise<PopupState> {
    return this.send({ type: 'application.discover-tracks' });
  }

  async startTranslation(input: Omit<Extract<ApplicationMessage, { type: 'application.start-translation' }>, 'type'>): Promise<PopupState> {
    return this.send({ type: 'application.start-translation', ...input });
  }

  async cancelTranslation(sessionId: string): Promise<PopupState> {
    return this.send({ type: 'application.cancel-translation', sessionId });
  }

  async retryFailedBatches(sessionId: string, batchIds: readonly string[]): Promise<PopupState> {
    return this.send({ type: 'application.retry-failed-batches', sessionId, batchIds });
  }

  async updateSubtitleSettings(settings: Extract<ApplicationMessage, { type: 'application.update-subtitle-settings' }>['settings']): Promise<PopupState> {
    return this.send({ type: 'application.update-subtitle-settings', settings });
  }

  async setSubtitlesEnabled(enabled: boolean): Promise<PopupState> {
    return this.send({ type: 'application.set-subtitles-enabled', enabled });
  }

  private async send<T>(message: ApplicationMessage): Promise<T> {
    const response = await browser.runtime.sendMessage<RuntimeResponse<T>>(message);
    if (!response?.ok || response.data === undefined) {
      throw new Error(response?.error?.message ?? 'The extension runtime did not respond.');
    }
    return response.data;
  }
}
