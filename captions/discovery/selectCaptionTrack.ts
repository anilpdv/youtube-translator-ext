import { CaptionError } from '../domain/CaptionError';
import type { CaptionTrack } from '../domain/CaptionTrack';

export interface TrackSelectionPreferences {
  readonly trackId?: string;
  readonly languageCode?: string;
  readonly preferManual: boolean;
}

export function selectCaptionTrack(
  tracks: readonly CaptionTrack[],
  preferences: TrackSelectionPreferences,
): CaptionTrack {
  if (preferences.trackId) {
    const explicit = tracks.find((track) => track.id === preferences.trackId);
    if (!explicit) {
      throw new CaptionError({
        code: 'TRACK_NOT_FOUND',
        message: 'The selected caption track is no longer available.',
        retryable: true,
      });
    }
    return explicit;
  }
  if (preferences.languageCode) {
    const matches = tracks.filter(
      (track) => track.languageCode === preferences.languageCode,
    );
    const preferred = preferences.preferManual
      ? matches.find((track) => track.kind === 'manual')
      : matches[0];
    if (preferred) return preferred;
  }
  return (
    tracks.find((track) => track.isDefault) ??
    tracks.find((track) => track.kind === 'manual') ??
    tracks[0]
  );
}
