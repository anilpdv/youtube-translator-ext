import type { SubtitleDisplaySettings } from '../domain/SubtitleDisplaySettings';
import type { SubtitleRenderCue } from '../domain/SubtitleRenderCue';

export interface OverlayViewModel {
  readonly visible: boolean;
  readonly cue: SubtitleRenderCue | null;
  readonly settings: SubtitleDisplaySettings;
}
