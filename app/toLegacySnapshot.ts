import type {
  TranslationPhase,
  TranslationStateSnapshot,
} from '../utils/types';
import type { SessionState } from './SessionState';

function mapStatusToLegacyPhase(status: SessionState['status']): TranslationPhase {
  switch (status) {
    case 'discovering-captions':
    case 'captions-ready':
      return 'extracting';
    case 'discovering-tracks':
    case 'tracks-ready':
    case 'loading-captions':
      return 'extracting';
    case 'preparing-translation':
    case 'translating':
    case 'paused':
    case 'partially-completed':
      return 'translating';
    case 'rendering':
      return 'translating';
    case 'completed':
      return 'ready';
    case 'failed':
      return 'error';
    case 'cancelled':
      return 'cancelled';
    case 'idle':
      return 'idle';
  }
}

export function toLegacySnapshot(
  state: Readonly<SessionState>,
): TranslationStateSnapshot {
  return {
    phase: mapStatusToLegacyPhase(state.status),
    message: state.message,
    videoId: state.videoId,
    translatedCount: state.progress.completedCues,
    totalCount: state.progress.totalCues,
    hasSubtitles: state.translatedTrack.length > 0,
    subtitlesEnabled: state.subtitlesEnabled,
    transcriptPanelOpen: state.transcriptPanelOpen,
    error: state.error?.message,
  };
}
