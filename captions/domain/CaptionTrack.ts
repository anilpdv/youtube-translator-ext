import type { CaptionFormat } from './CaptionFormat';

export type CaptionTrackKind = 'manual' | 'automatic';

export interface CaptionTrack {
  readonly id: string;
  readonly languageCode: string;
  readonly languageName: string;
  readonly kind: CaptionTrackKind;
  readonly isDefault: boolean;
  readonly isTranslatable: boolean;
  readonly baseUrl: string;
  readonly formatHint?: CaptionFormat;
}
