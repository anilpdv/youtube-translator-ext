import type { SessionState } from './SessionState';
import { DEFAULT_SUBTITLE_DISPLAY_SETTINGS } from '../rendering/domain/SubtitleDisplaySettings';

export interface InitialStateOptions {
  subtitlesEnabled?: boolean;
}

export function createInitialState(
  options: InitialStateOptions,
): SessionState {
  return {
    status: 'idle',
    sessionId: null,
    videoId: null,
    message: '',
    sourceTrack: [],
    translatedTrack: [],
    activeCueIndex: -1,
    subtitlesEnabled: options.subtitlesEnabled ?? false,
    transcriptPanelOpen: false,
    progress: {
      completedBatches: 0,
      failedBatches: 0,
      totalBatches: 0,
      completedCues: 0,
      failedCues: 0,
      totalCues: 0,
      currentAttempt: 0,
    },
    error: null,
    availableCaptionTracks: [],
    selectedCaptionTrackId: null,
    translationDocument: null,
    batchResults: [],
    subtitleDisplay: DEFAULT_SUBTITLE_DISPLAY_SETTINGS,
    activeRenderedCueId: null,
    renderingActive: false,
    activation: { requested: false, source: null, requestedAt: null },
  };
}
