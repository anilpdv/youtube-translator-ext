import type { TranslationDocument } from '../../translation/domain/TranslationDocument';
import { createSubtitleDisplayTrack } from '../adapters/createSubtitleRenderTrack';
import type { SubtitleDisplaySettings } from '../domain/SubtitleDisplaySettings';
import { OverlayController } from '../overlay/OverlayController';
import { PlayerLocator } from '../player/PlayerLocator';
import { YouTubePlayerAdapter } from '../player/YouTubePlayerAdapter';

export class SubtitleRenderingService {
  private player: YouTubePlayerAdapter | null = null;
  private overlay: OverlayController | null = null;

  constructor(private readonly locator = new PlayerLocator()) {}

  async show(document: TranslationDocument, settings: SubtitleDisplaySettings): Promise<void> {
    await this.clear();
    const located = this.locator.locate();
    const track = createSubtitleDisplayTrack(document);
    this.player = new YouTubePlayerAdapter(located);
    this.overlay = new OverlayController(this.player, track, settings);
    this.overlay.start();
  }

  updateSettings(settings: SubtitleDisplaySettings): void {
    this.overlay?.updateSettings(settings);
  }

  async clear(): Promise<void> {
    const overlay = this.overlay;
    const player = this.player;
    this.overlay = null;
    this.player = null;
    await overlay?.dispose();
    await player?.dispose();
  }

  isActive(): boolean {
    return this.overlay !== null && this.player !== null;
  }
}
