import type { CaptionFormat } from '../domain/CaptionFormat';

export interface CaptionResponse {
  readonly body: string;
  readonly contentType: string | null;
  readonly format: CaptionFormat;
  readonly byteLength: number;
}
