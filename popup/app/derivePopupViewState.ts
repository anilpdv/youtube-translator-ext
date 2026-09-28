import type { PopupState } from './PopupState';
import type { PopupViewState } from './PopupViewState';

export function derivePopupViewState(state: PopupState): PopupViewState {
  if (!state.runtimeAvailable) {
    return { screen: 'loading', primaryAction: 'none', translationFormEnabled: false, displayControlsVisible: false };
  }
  if (!state.video.supported) {
    return { screen: 'unsupported', primaryAction: 'none', translationFormEnabled: false, displayControlsVisible: false };
  }
  if (state.error) {
    return {
      screen: 'error',
      primaryAction: state.error.action === 'configure-provider'
        ? 'configure-provider'
        : state.error.retryable ? 'discover-tracks' : 'none',
      translationFormEnabled: false,
      displayControlsVisible: state.translationAvailable,
    };
  }
  switch (state.status) {
    case 'discovering-tracks':
    case 'loading-captions':
    case 'translating':
      return { screen: 'translating', primaryAction: 'cancel-translation', translationFormEnabled: false, displayControlsVisible: state.translationAvailable };
    case 'partially-completed':
      return { screen: 'partial', primaryAction: 'retry-failed', translationFormEnabled: true, displayControlsVisible: true };
    case 'completed':
      return { screen: 'completed', primaryAction: 'show-subtitles', translationFormEnabled: true, displayControlsVisible: true };
    case 'idle':
    case 'cancelled':
    case 'tracks-ready':
      return {
        screen: state.captionTracks.length === 0 ? 'no-captions' : 'ready',
        primaryAction: state.captionTracks.length === 0
          ? 'discover-tracks'
          : state.providerReady ? 'start-translation' : 'configure-provider',
        translationFormEnabled: true,
        displayControlsVisible: state.translationAvailable,
      };
    case 'failed':
      return { screen: 'error', primaryAction: 'none', translationFormEnabled: true, displayControlsVisible: state.translationAvailable };
    default:
      return { screen: 'loading', primaryAction: 'none', translationFormEnabled: false, displayControlsVisible: false };
  }
}
