import { describe, expect, it } from 'vitest';
import { derivePopupViewState } from '../../popup/app/derivePopupViewState';
import type { PopupState } from '../../popup/app/PopupState';

const state = (overrides: Partial<PopupState> = {}): PopupState => ({
  runtimeAvailable: true,
  sessionId: null,
  status: 'idle',
  video: { supported: true, videoId: 'video', title: null, url: null },
  captionTracks: [{
    id: 'track', languageCode: 'en', languageName: 'English',
    kind: 'manual', isDefault: true, isTranslatable: true,
  }],
  selectedCaptionTrackId: 'track',
  targetLanguage: 'French',
  providerId: 'gemini',
  modelId: 'gemini-2.5-flash',
  providerReady: true,
  providerMessage: 'Ready',
  progress: { completedBatches: 0, failedBatches: 0, totalBatches: 0, completedCues: 0, failedCues: 0, totalCues: 0 },
  translationAvailable: false,
  failedBatchIds: [],
  subtitlesEnabled: false,
  subtitleDisplay: { mode: 'bilingual', fontScale: 1, backgroundOpacity: 0.72, textOpacity: 1, verticalPosition: 'bottom', syncOffsetMs: 0, showDuringPause: true },
  message: '',
  error: null,
  ...overrides,
});

describe('derivePopupViewState', () => {
  it('requires provider setup before translation', () => {
    expect(derivePopupViewState(state({ providerReady: false })).primaryAction).toBe('configure-provider');
  });
  it('shows cancellation during translation', () => {
    expect(derivePopupViewState(state({ status: 'translating' }))).toMatchObject({ screen: 'translating', primaryAction: 'cancel-translation' });
  });
  it('offers retry for partial completion', () => {
    expect(derivePopupViewState(state({ status: 'partially-completed' })).primaryAction).toBe('retry-failed');
  });
});
