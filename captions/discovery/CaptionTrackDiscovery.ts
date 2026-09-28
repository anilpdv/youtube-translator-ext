import { CaptionError } from '../domain/CaptionError';
import type { CaptionTrack } from '../domain/CaptionTrack';
import type {
  YouTubeCaptionTrackData,
  YouTubePlayerData,
} from './YouTubePlayerDataTypes';
import type { YouTubePlayerDataReader } from './YouTubePlayerDataReader';

export class CaptionTrackDiscovery {
  constructor(private readonly playerDataReader: YouTubePlayerDataReader) {}

  async discover(signal?: AbortSignal): Promise<readonly CaptionTrack[]> {
    signal?.throwIfAborted();
    const playerData = await this.playerDataReader.read(signal);
    signal?.throwIfAborted();
    const renderer = playerData.captions?.playerCaptionsTracklistRenderer;
    if (!renderer) {
      throw new CaptionError({
        code: 'CAPTION_METADATA_NOT_FOUND',
        message: 'Caption metadata is not available.',
      });
    }
    if (!Array.isArray(renderer.captionTracks)) {
      throw new CaptionError({
        code: 'NO_CAPTION_TRACKS',
        message: 'This video does not expose a caption track.',
      });
    }
    const tracks = renderer.captionTracks
      .map((value, index) => this.parseTrack(value, index))
      .filter((track): track is CaptionTrack => track !== null);
    if (tracks.length === 0) {
      throw new CaptionError({
        code: 'NO_CAPTION_TRACKS',
        message: 'No usable caption tracks were found.',
      });
    }
    return tracks;
  }

  private parseTrack(value: unknown, index: number): CaptionTrack | null {
    if (!this.isTrackData(value)) return null;
    const baseUrl = typeof value.baseUrl === 'string' ? value.baseUrl : null;
    const languageCode =
      typeof value.languageCode === 'string' ? value.languageCode : null;
    if (!baseUrl || !languageCode) return null;
    const languageName = this.readLanguageName(value) ?? languageCode;
    return {
      id:
        typeof value.vssId === 'string'
          ? value.vssId
          : `${languageCode}-${index}`,
      languageCode,
      languageName,
      kind: value.kind === 'asr' ? 'automatic' : 'manual',
      isDefault: index === 0,
      isTranslatable: value.isTranslatable === true,
      baseUrl,
    };
  }

  private isTrackData(value: unknown): value is YouTubeCaptionTrackData {
    return typeof value === 'object' && value !== null;
  }

  private readLanguageName(track: YouTubeCaptionTrackData): string | null {
    const simpleText = track.name?.simpleText;
    if (typeof simpleText === 'string') return simpleText;
    const runs = track.name?.runs;
    if (!Array.isArray(runs)) return null;
    const text = runs
      .map((run) => (typeof run.text === 'string' ? run.text : ''))
      .join('')
      .trim();
    return text || null;
  }
}
