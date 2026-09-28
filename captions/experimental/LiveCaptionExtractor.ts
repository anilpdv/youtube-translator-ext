import type { CaptionDocument } from '../domain/CaptionDocument';
import type { ExperimentalCaptionExtractor } from './ExperimentalCaptionExtractor';

/**
 * Experimental adapter boundary. Live caption observation is not part of the
 * stable caption pipeline.
 */
export class LiveCaptionExtractor implements ExperimentalCaptionExtractor {
  readonly id = 'live-caption';

  async extract(_videoId: string, signal?: AbortSignal): Promise<CaptionDocument> {
    signal?.throwIfAborted();
    throw new Error('Live caption extraction is experimental and not enabled.');
  }
}
