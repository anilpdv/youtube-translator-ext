import type { ApplicationError } from './ApplicationError';
import type { TranscriptSegment, TranslatedSegment } from '../utils/types';
import type { CaptionTrack } from '../captions/domain/CaptionTrack';
import type { TranslationBatchResult } from '../translation/domain/TranslationBatch';
import type { TranslationDocument } from '../translation/domain/TranslationDocument';
import type { SubtitleDisplaySettings } from '../rendering/domain/SubtitleDisplaySettings';

export type SessionStatus =
  | 'idle'
  | 'discovering-tracks'
  | 'tracks-ready'
  | 'loading-captions'
  | 'discovering-captions'
  | 'captions-ready'
  | 'preparing-translation'
  | 'translating'
  | 'paused'
  | 'partially-completed'
  | 'rendering'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface SessionProgress {
  completedBatches: number;
  failedBatches: number;
  totalBatches: number;
  completedCues: number;
  failedCues: number;
  totalCues: number;
  currentAttempt: number;
}

export interface SessionState {
  status: SessionStatus;
  sessionId: string | null;
  videoId: string | null;
  message: string;
  sourceTrack: TranscriptSegment[];
  translatedTrack: TranslatedSegment[];
  activeCueIndex: number;
  subtitlesEnabled: boolean;
  transcriptPanelOpen: boolean;
  progress: SessionProgress;
  error: ApplicationError | null;
  availableCaptionTracks: readonly CaptionTrack[];
  selectedCaptionTrackId: string | null;
  translationDocument: TranslationDocument | null;
  batchResults: readonly TranslationBatchResult[];
  subtitleDisplay: SubtitleDisplaySettings;
  activeRenderedCueId: string | null;
  renderingActive: boolean;
}

export type SessionStateUpdate = Partial<
  Omit<SessionState, 'progress'>
> & {
  progress?: Partial<SessionProgress>;
};

const allowedTransitions: Record<
  SessionStatus,
  ReadonlySet<SessionStatus>
> = {
  idle: new Set(['discovering-captions', 'cancelled', 'failed']),
  'discovering-tracks': new Set(['tracks-ready', 'cancelled', 'failed']),
  'tracks-ready': new Set([
    'loading-captions',
    'discovering-tracks',
    'cancelled',
    'failed',
  ]),
  'loading-captions': new Set([
    'captions-ready',
    'tracks-ready',
    'cancelled',
    'failed',
  ]),
  'discovering-captions': new Set(['captions-ready', 'cancelled', 'failed']),
  'captions-ready': new Set(['preparing-translation', 'cancelled', 'failed']),
  'preparing-translation': new Set(['translating', 'cancelled', 'failed']),
  translating: new Set([
    'paused',
    'rendering',
    'completed',
    'partially-completed',
    'cancelled',
    'failed',
  ]),
  paused: new Set(['translating', 'cancelled', 'failed']),
  rendering: new Set(['translating', 'completed', 'cancelled', 'failed']),
  'partially-completed': new Set([
    'translating',
    'completed',
    'cancelled',
    'failed',
  ]),
  completed: new Set(['discovering-captions', 'cancelled']),
  cancelled: new Set(['idle', 'discovering-captions']),
  failed: new Set([
    'idle',
    'discovering-captions',
    'preparing-translation',
    'translating',
    'cancelled',
  ]),
};

export function canTransition(
  current: SessionStatus,
  next: SessionStatus,
): boolean {
  return current === next || allowedTransitions[current].has(next);
}
