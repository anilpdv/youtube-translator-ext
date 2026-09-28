import type { CaptionDocument } from '../domain/CaptionDocument';
import type { CaptionError } from '../domain/CaptionError';

export type CaptionExtractionResult =
  | { readonly ok: true; readonly document: CaptionDocument }
  | { readonly ok: false; readonly error: CaptionError };
