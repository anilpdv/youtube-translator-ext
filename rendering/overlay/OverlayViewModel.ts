import type { SubtitleDisplaySettings } from '../domain/SubtitleDisplaySettings';
import type { SubtitleDisplaySlice } from '../domain/SubtitleDisplaySlice';

export interface OverlayViewModel {
  readonly visible: boolean;
  readonly slice: SubtitleDisplaySlice | null;
  readonly settings: SubtitleDisplaySettings;
}
