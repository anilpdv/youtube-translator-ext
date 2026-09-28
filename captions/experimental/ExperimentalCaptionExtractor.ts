import type { CaptionDocument } from '../domain/CaptionDocument';

export interface ExperimentalCaptionExtractor {
  readonly id: string;
  extract(videoId: string, signal?: AbortSignal): Promise<CaptionDocument>;
}
