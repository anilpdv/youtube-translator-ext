import type { SubtitleDisplaySettings } from '../../rendering/domain/SubtitleDisplaySettings';

export interface GetApplicationStateMessage { readonly type: 'application.get-state'; }
export interface DiscoverCaptionTracksMessage { readonly type: 'application.discover-tracks'; }
export interface StartTranslationMessage {
  readonly type: 'application.start-translation';
  readonly captionTrackId: string;
  readonly targetLanguage: string;
  readonly providerId: string;
  readonly modelId: string;
}
export interface CancelTranslationMessage {
  readonly type: 'application.cancel-translation';
  readonly sessionId: string;
}
export interface RetryFailedBatchesMessage {
  readonly type: 'application.retry-failed-batches';
  readonly sessionId: string;
  readonly batchIds: readonly string[];
}
export interface SetSubtitlesEnabledMessage {
  readonly type: 'application.set-subtitles-enabled';
  readonly enabled: boolean;
}
export interface UpdateSubtitleSettingsMessage {
  readonly type: 'application.update-subtitle-settings';
  readonly settings: Partial<SubtitleDisplaySettings>;
}
export interface ClearCurrentTranslationMessage { readonly type: 'application.clear-translation'; }
export interface TestProviderMessage {
  readonly type: 'provider.test-connection';
  readonly providerId: string;
  readonly modelId: string;
}

export type ApplicationMessage =
  | GetApplicationStateMessage
  | DiscoverCaptionTracksMessage
  | StartTranslationMessage
  | CancelTranslationMessage
  | RetryFailedBatchesMessage
  | SetSubtitlesEnabledMessage
  | UpdateSubtitleSettingsMessage
  | ClearCurrentTranslationMessage
  | TestProviderMessage;
