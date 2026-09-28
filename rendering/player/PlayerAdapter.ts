import type { Disposable } from '../../runtime/Disposable';
import type { PlaybackSnapshot } from './PlayerEvents';

export interface PlayerAdapter extends Disposable {
  getVideoElement(): HTMLVideoElement;
  getOverlayContainer(): HTMLElement;
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void;
  isConnected(): boolean;
}
