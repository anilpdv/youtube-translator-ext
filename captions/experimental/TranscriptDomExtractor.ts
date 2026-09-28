import type { CaptionDocument } from '../domain/CaptionDocument';
import type { ExperimentalCaptionExtractor } from './ExperimentalCaptionExtractor';

/**
 * Experimental adapter boundary. It is intentionally not used by the stable
 * extraction service or as an automatic fallback.
 */
export class TranscriptDomExtractor implements ExperimentalCaptionExtractor {
  readonly id = 'transcript-dom';

  async extract(_videoId: string, signal?: AbortSignal): Promise<CaptionDocument> {
    signal?.throwIfAborted();
    throw new Error('Transcript DOM extraction is experimental and not enabled.');
  }
}
