import { CaptionError } from '../domain/CaptionError';
import type { YouTubePlayerData } from './YouTubePlayerDataTypes';

export interface YouTubePlayerDataReader {
  read(signal?: AbortSignal): Promise<YouTubePlayerData>;
}

export class PagePlayerDataReader implements YouTubePlayerDataReader {
  async read(signal?: AbortSignal): Promise<YouTubePlayerData> {
    signal?.throwIfAborted();
    const data = this.readFromKnownPageSources();
    if (!data) {
      throw new CaptionError({
        code: 'PLAYER_DATA_NOT_FOUND',
        message: 'YouTube player metadata could not be found.',
        retryable: true,
      });
    }
    return data;
  }

  private readFromKnownPageSources(): YouTubePlayerData | null {
    const player = document.getElementById('movie_player') as {
      getPlayerResponse?: () => unknown;
    } | null;
    const response = player?.getPlayerResponse?.();
    if (this.isPlayerData(response)) return response;

    for (const script of Array.from(document.querySelectorAll('script'))) {
      const text = script.textContent ?? '';
      const match = text.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])/);
      if (!match) continue;
      try {
        const parsed = JSON.parse(`{"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":${match[1]}}}}`);
        if (this.isPlayerData(parsed)) return parsed;
      } catch {
        // Continue looking for a complete player response.
      }
    }
    return null;
  }

  private isPlayerData(value: unknown): value is YouTubePlayerData {
    return typeof value === 'object' && value !== null;
  }
}
