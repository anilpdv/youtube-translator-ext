import type { SessionState, SessionStatus } from '../../app/SessionState';
import type { PopupErrorState, PopupSessionStatus, PopupState } from './PopupState';

export interface PopupStateContext {
  readonly currentUrl: string | null;
  readonly videoTitle: string | null;
  readonly providerId: string;
  readonly modelId: string;
  readonly providerReady: boolean;
  readonly providerMessage: string;
  readonly targetLanguage: string;
}

export function createPopupState(
  state: Readonly<SessionState>,
  context: PopupStateContext,
): PopupState {
  return {
    runtimeAvailable: true,
    sessionId: state.sessionId,
    status: mapSessionStatus(state.status),
    video: {
      supported: state.videoId !== null,
      videoId: state.videoId,
      title: context.videoTitle,
      url: context.currentUrl,
    },
    captionTracks: state.availableCaptionTracks.map((track) => ({
      id: track.id,
      languageCode: track.languageCode,
      languageName: track.languageName,
      kind: track.kind,
      isDefault: track.isDefault,
      isTranslatable: track.isTranslatable,
    })),
    selectedCaptionTrackId: state.selectedCaptionTrackId,
    targetLanguage: context.targetLanguage,
    providerId: context.providerId,
    modelId: context.modelId,
    providerReady: context.providerReady,
    providerMessage: context.providerMessage,
    progress: {
      completedBatches: state.progress.completedBatches,
      failedBatches: state.progress.failedBatches,
      totalBatches: state.progress.totalBatches,
      completedCues: state.progress.completedCues,
      failedCues: state.progress.failedCues,
      totalCues: state.progress.totalCues,
    },
    translationAvailable: state.translationDocument !== null,
    failedBatchIds: state.batchResults
      .filter((result) => result.status === 'failed')
      .map((result) => result.batchId),
    subtitlesEnabled: state.subtitlesEnabled,
    subtitleDisplay: state.subtitleDisplay,
    message: state.message,
    error: state.error
      ? {
          code: state.error.code,
          title: state.error.title,
          message: state.error.message,
          retryable: state.error.retryable,
          action: mapErrorAction(state.error.code),
        }
      : null,
  };
}

function mapSessionStatus(status: SessionStatus): PopupSessionStatus {
  if (
    status === 'preparing-translation' ||
    status === 'paused' ||
    status === 'rendering' ||
    status === 'discovering-captions'
  ) {
    return 'translating';
  }
  if (status === 'captions-ready') return 'tracks-ready';
  return status;
}

function mapErrorAction(code: string): NonNullable<PopupErrorState>['action'] {
  if (code === 'INVALID_CREDENTIALS' || code === 'TRANSLATION_FAILED') {
    return 'configure-provider';
  }
  if (code === 'CAPTION_DISCOVERY_FAILED') return 'retry-discovery';
  if (code === 'RENDERING_FAILED') return 'reload-video';
  return 'none';
}
