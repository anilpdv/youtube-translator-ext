import { RenderingError } from '../domain/RenderingError';

export class OverlayMount {
  readonly element: HTMLDivElement;
  private disposed = false;

  constructor(container: HTMLElement) {
    container
      .querySelectorAll<HTMLElement>('[data-ai-subtitle-overlay="true"]')
      .forEach((element) => element.remove());
    const element = document.createElement('div');
    element.dataset.aiSubtitleOverlay = 'true';
    element.className = 'ai-subtitle-overlay-root';
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-atomic', 'true');
    element.style.pointerEvents = 'none';
    try {
      container.appendChild(element);
    } catch (cause) {
      throw new RenderingError({
        code: 'OVERLAY_MOUNT_FAILED',
        message: 'The subtitle overlay could not be mounted.',
        retryable: true,
        cause,
      });
    }
    this.element = element;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.element.remove();
  }
}
