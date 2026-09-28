import { DisposableStack } from '../../runtime/DisposableStack';
import type { ActiveSubtitleSnapshot } from '../domain/ActiveSubtitleSnapshot';
import type { SubtitleDisplaySettings } from '../domain/SubtitleDisplaySettings';
import type { SubtitleRenderTrack } from '../domain/SubtitleRenderTrack';
import type { PlayerAdapter } from '../player/PlayerAdapter';
import { CueIndex } from './CueIndex';

export type ActiveCueListener = (snapshot: ActiveSubtitleSnapshot) => void;

export class SubtitleScheduler {
  private readonly resources = new DisposableStack();
  private readonly cueIndex: CueIndex;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private lastIndex: number | null = null;
  private lastPlaying: boolean | null = null;

  constructor(
    private readonly player: PlayerAdapter,
    private readonly track: SubtitleRenderTrack,
    private settings: SubtitleDisplaySettings,
    private readonly listener: ActiveCueListener,
  ) {
    this.cueIndex = new CueIndex(track.cues);
  }

  start(): void {
    if (this.disposed) return;
    this.resources.use(this.player.subscribe(() => this.evaluate(true)));
    this.evaluate(true);
  }

  updateSettings(settings: SubtitleDisplaySettings): void {
    this.settings = settings;
    this.evaluate(true);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    await this.resources.dispose();
  }

  private evaluate(force = false): void {
    if (this.disposed || !this.player.isConnected()) return;
    const playback = this.player.getSnapshot();
    const adjustedTime = Math.max(0, playback.currentTimeMs + this.settings.syncOffsetMs);
    const index = this.cueIndex.find(adjustedTime);
    const visibleIndex = playback.paused && !this.settings.showDuringPause ? -1 : index;
    const playing = !playback.paused;
    if (force || visibleIndex !== this.lastIndex || playing !== this.lastPlaying) {
      this.lastIndex = visibleIndex;
      this.lastPlaying = playing;
      this.listener({
        videoId: this.track.videoId,
        sessionId: this.track.sessionId,
        playbackTimeMs: adjustedTime,
        cueIndex: visibleIndex,
        cue: visibleIndex >= 0 ? this.track.cues[visibleIndex] : null,
        playing,
      });
    }
    this.scheduleNextWake(adjustedTime, visibleIndex, playback.playbackRate);
  }

  private scheduleNextWake(timeMs: number, index: number, playbackRate: number): void {
    if (this.timer !== null) clearTimeout(this.timer);
    const current = index >= 0 ? this.track.cues[index] : null;
    const next = index >= 0
      ? this.track.cues[index + 1]
      : this.track.cues.find((cue) => cue.startMs > timeMs);
    const boundaries = [
      current && current.endMs > timeMs ? current.endMs : null,
      next && next.startMs > timeMs ? next.startMs : null,
    ].filter((value): value is number => value !== null);
    const delay = boundaries.length
      ? Math.max(16, Math.min(1_000, (Math.min(...boundaries) - timeMs) / Math.max(0.1, playbackRate)))
      : 1_000;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.evaluate();
    }, delay);
  }
}
