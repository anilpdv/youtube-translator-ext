import type { SubtitleDisplaySettings } from '../../rendering/domain/SubtitleDisplaySettings';
export interface PopupCaptionTrack {
  readonly id: string;
  readonly languageCode: string;
  readonly languageName: string;
  readonly kind: 'manual' | 'automatic';
  readonly isDefault: boolean;
  readonly isTranslatable: boolean;
}

export type PopupSessionStatus =
  | 'unavailable'
  | 'idle'
  | 'discovering-tracks'
  | 'tracks-ready'
  | 'loading-captions'
  | 'translating'
  | 'partially-completed'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface PopupVideoState {
  readonly supported: boolean;
  readonly videoId: string | null;
  readonly title: string | null;
  readonly url: string | null;
}

export interface PopupTranslationProgress {
  readonly completedBatches: number;
  readonly failedBatches: number;
  readonly totalBatches: number;
  readonly completedCues: number;
  readonly failedCues: number;
  readonly totalCues: number;
}

export interface PopupErrorState {
  readonly code: string;
  readonly title: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly action:
    | 'retry-discovery'
    | 'configure-provider'
    | 'retry-translation'
    | 'reload-video'
    | 'none';
}

export interface PopupState {
  readonly runtimeAvailable: boolean;
  readonly sessionId: string | null;
  readonly status: PopupSessionStatus;
  readonly video: PopupVideoState;
  readonly captionTracks: readonly PopupCaptionTrack[];
  readonly selectedCaptionTrackId: string | null;
  readonly targetLanguage: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly providerReady: boolean;
  readonly providerMessage: string;
  readonly progress: PopupTranslationProgress;
  readonly translationAvailable: boolean;
  readonly failedBatchIds: readonly string[];
  readonly subtitlesEnabled: boolean;
  readonly subtitleDisplay: SubtitleDisplaySettings;
  readonly message: string;
  readonly error: PopupErrorState | null;
}
