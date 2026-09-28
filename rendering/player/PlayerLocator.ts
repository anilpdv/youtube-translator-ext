import { RenderingError } from '../domain/RenderingError';

export interface LocatedPlayer {
  readonly playerElement: HTMLElement;
  readonly videoElement: HTMLVideoElement;
  readonly overlayContainer: HTMLElement;
}

export class PlayerLocator {
  locate(): LocatedPlayer {
    const playerElement = document.querySelector<HTMLElement>('#movie_player');
    if (!playerElement) {
      throw new RenderingError({
        code: 'PLAYER_NOT_FOUND',
        message: 'The YouTube player could not be found.',
        retryable: true,
      });
    }
    const videoElement = playerElement.querySelector<HTMLVideoElement>('video');
    if (!videoElement) {
      throw new RenderingError({
        code: 'VIDEO_ELEMENT_NOT_FOUND',
        message: 'The player video element could not be found.',
        retryable: true,
      });
    }
    return { playerElement, videoElement, overlayContainer: playerElement };
  }
}
