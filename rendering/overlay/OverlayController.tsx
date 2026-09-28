import React from 'react';
import ReactDOM from 'react-dom/client';
import type { ActiveSubtitleSnapshot } from '../domain/ActiveSubtitleSnapshot';
import type { SubtitleDisplaySettings } from '../domain/SubtitleDisplaySettings';
import type { SubtitleRenderTrack } from '../domain/SubtitleRenderTrack';
import type { PlayerAdapter } from '../player/PlayerAdapter';
import { SubtitleScheduler } from '../scheduling/SubtitleScheduler';
import { OverlayMount } from './OverlayMount';
import { SubtitleOverlay } from './SubtitleOverlay';
import type { OverlayViewModel } from './OverlayViewModel';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import './subtitleOverlay.css';

export class OverlayController {
  private readonly mount: OverlayMount;
  private readonly root: ReactDOM.Root;
  private readonly scheduler: SubtitleScheduler;
  private disposed = false;
  private snapshot: ActiveSubtitleSnapshot | null = null;

  constructor(
    player: PlayerAdapter,
    private readonly track: SubtitleRenderTrack,
    private settings: SubtitleDisplaySettings,
  ) {
    this.mount = new OverlayMount(player.getOverlayContainer());
    this.root = ReactDOM.createRoot(this.mount.element);
    this.scheduler = new SubtitleScheduler(player, track, settings, (snapshot) => {
      if (snapshot.sessionId !== track.sessionId || snapshot.videoId !== track.videoId) return;
      this.snapshot = snapshot;
      this.render();
    });
  }

  start(): void {
    if (this.disposed) return;
    this.render();
    this.scheduler.start();
  }

  updateSettings(settings: SubtitleDisplaySettings): void {
    if (this.disposed) return;
    this.settings = settings;
    this.scheduler.updateSettings(settings);
    this.render();
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.scheduler.dispose();
    this.root.unmount();
    this.mount.dispose();
  }

  private render(): void {
    if (this.disposed) return;
    const model: OverlayViewModel = {
      visible: this.snapshot?.cue != null,
      cue: this.snapshot?.cue ?? null,
      settings: this.settings,
    };
    this.root.render(
      <ErrorBoundary name="SubtitleOverlay">
        <SubtitleOverlay model={model} />
      </ErrorBoundary>,
    );
  }
}
