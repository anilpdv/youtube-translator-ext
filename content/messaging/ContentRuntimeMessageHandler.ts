import type { ApplicationController } from '../../app/ApplicationController';
import type { ApplicationMessage } from '../../background/messages/ApplicationMessages';
import { validateApplicationMessage } from '../../background/messages/validateApplicationMessage';
import { createPopupState } from '../../popup/app/createPopupState';

export class ContentRuntimeMessageHandler {
  constructor(private readonly application: ApplicationController) {}

  async handle(message: unknown): Promise<unknown> {
    if (!validateApplicationMessage(message)) {
      return {
        ok: false,
        error: { code: 'INVALID_MESSAGE', message: 'The extension received an invalid request.' },
      };
    }
    try {
      const state = await this.execute(message);
      return { ok: true, data: state };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        },
      };
    }
  }

  private async execute(message: ApplicationMessage) {
    switch (message.type) {
      case 'application.get-state':
        return this.getPopupState();
      case 'application.discover-tracks':
        await this.application.discoverTracksForCurrentVideo();
        return this.getPopupState();
      case 'application.start-translation':
        await this.application.startTranslationWorkflow({ ...message, source: 'popup' });
        return this.getPopupState();
      case 'application.cancel-translation':
        this.application.cancelSessionById(message.sessionId);
        return this.getPopupState();
      case 'application.set-subtitles-enabled':
        await this.application.setSubtitlesEnabled(message.enabled);
        return this.getPopupState();
      case 'application.update-subtitle-settings':
        this.application.updateSubtitleDisplaySettings(message.settings);
        return this.getPopupState();
      case 'application.clear-translation':
        await this.application.clearCurrentTranslation();
        return this.getPopupState();
      case 'application.retry-failed-batches':
        throw new Error('Retrying individual batches is not yet available.');
      case 'provider.test-connection':
        throw new Error('Provider connection testing is not yet available.');
    }
  }

  private getPopupState() {
    return createPopupState(
      this.application.store.getSnapshot(),
      this.application.getPopupStateContext(),
    );
  }
}
