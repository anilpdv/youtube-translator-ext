import { CaptionError } from '../domain/CaptionError';
import type { CaptionDocument } from '../domain/CaptionDocument';
import type { CaptionTrackDiscovery } from '../discovery/CaptionTrackDiscovery';
import {
  selectCaptionTrack,
  type TrackSelectionPreferences,
} from '../discovery/selectCaptionTrack';
import type { CaptionFetcher } from '../fetching/CaptionFetcher';
import type { CaptionNormalizer } from '../normalization/CaptionNormalizer';
import type { CaptionParserRegistry } from '../parsing/CaptionParserRegistry';
import type { CaptionValidator } from '../validation/CaptionValidator';

export interface ExtractCaptionsRequest {
  readonly videoId: string;
  readonly selection: TrackSelectionPreferences;
  readonly signal?: AbortSignal;
}

export class CaptionExtractionService {
  constructor(
    private readonly discovery: CaptionTrackDiscovery,
    private readonly fetcher: CaptionFetcher,
    private readonly parsers: CaptionParserRegistry,
    private readonly normalizer: CaptionNormalizer,
    private readonly validator: CaptionValidator,
  ) {}

  async discoverTracks(signal?: AbortSignal) {
    return this.discovery.discover(signal);
  }

  async extract(request: ExtractCaptionsRequest): Promise<CaptionDocument> {
    const { signal } = request;
    signal?.throwIfAborted();
    const tracks = await this.discovery.discover(signal);
    signal?.throwIfAborted();
    const track = selectCaptionTrack(tracks, request.selection);
    const response = await this.fetcher.fetch(track, signal);
    signal?.throwIfAborted();
    if (response.format === 'unknown') {
      throw new CaptionError({
        code: 'CAPTION_FORMAT_UNKNOWN',
        message: 'The caption response format could not be identified.',
      });
    }
    const rawCues = this.parsers.get(response.format).parse(response.body, signal);
    const cues = this.normalizer.normalize(rawCues, signal);
    const report = this.validator.validate(cues);
    if (!report.valid) {
      throw new CaptionError({
        code: 'CAPTION_VALIDATION_FAILED',
        message: 'The caption track failed integrity validation.',
        details: {
          issueCodes: report.issues.map((issue) => issue.code),
          cueCount: report.cueCount,
          overlapCount: report.overlapCount,
        },
      });
    }
    return {
      videoId: request.videoId,
      track,
      format: response.format,
      cues,
      durationMs: report.durationMs,
      textLength: report.textLength,
      extractedAt: Date.now(),
      warnings: report.issues
        .filter((issue) => issue.severity === 'warning')
        .map((issue) => issue.message),
    };
  }
}
