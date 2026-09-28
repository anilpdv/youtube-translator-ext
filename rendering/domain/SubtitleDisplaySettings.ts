import type { SubtitleDisplayMode } from './SubtitleDisplayMode';

export type SubtitleVerticalPosition = 'bottom' | 'middle' | 'top';

export interface SubtitleDisplaySettings {
  readonly mode: SubtitleDisplayMode;
  readonly fontScale: number;
  readonly backgroundOpacity: number;
  readonly textOpacity: number;
  readonly verticalPosition: SubtitleVerticalPosition;
  readonly syncOffsetMs: number;
  readonly showDuringPause: boolean;
}

export const DEFAULT_SUBTITLE_DISPLAY_SETTINGS: SubtitleDisplaySettings = {
  mode: 'bilingual',
  fontScale: 1,
  backgroundOpacity: 0.72,
  textOpacity: 1,
  verticalPosition: 'bottom',
  syncOffsetMs: 0,
  showDuringPause: true,
};

export const SUBTITLE_DISPLAY_LIMITS = {
  minimumFontScale: 0.75,
  maximumFontScale: 2,
  minimumBackgroundOpacity: 0,
  maximumBackgroundOpacity: 1,
  minimumTextOpacity: 0.4,
  maximumTextOpacity: 1,
  minimumSyncOffsetMs: -10_000,
  maximumSyncOffsetMs: 10_000,
} as const;

export function sanitizeSubtitleDisplaySettings(
  value: SubtitleDisplaySettings,
): SubtitleDisplaySettings {
  return {
    ...value,
    fontScale: clamp(
      value.fontScale,
      SUBTITLE_DISPLAY_LIMITS.minimumFontScale,
      SUBTITLE_DISPLAY_LIMITS.maximumFontScale,
      DEFAULT_SUBTITLE_DISPLAY_SETTINGS.fontScale,
    ),
    backgroundOpacity: clamp(
      value.backgroundOpacity,
      SUBTITLE_DISPLAY_LIMITS.minimumBackgroundOpacity,
      SUBTITLE_DISPLAY_LIMITS.maximumBackgroundOpacity,
      DEFAULT_SUBTITLE_DISPLAY_SETTINGS.backgroundOpacity,
    ),
    textOpacity: clamp(
      value.textOpacity,
      SUBTITLE_DISPLAY_LIMITS.minimumTextOpacity,
      SUBTITLE_DISPLAY_LIMITS.maximumTextOpacity,
      DEFAULT_SUBTITLE_DISPLAY_SETTINGS.textOpacity,
    ),
    syncOffsetMs: clamp(
      value.syncOffsetMs,
      SUBTITLE_DISPLAY_LIMITS.minimumSyncOffsetMs,
      SUBTITLE_DISPLAY_LIMITS.maximumSyncOffsetMs,
      DEFAULT_SUBTITLE_DISPLAY_SETTINGS.syncOffsetMs,
    ),
  };
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
