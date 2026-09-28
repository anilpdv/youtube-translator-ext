import { describe, expect, it, vi } from 'vitest';
import { NavigationController } from '../../youtube/NavigationController';

describe('NavigationController', () => {
  it('cancels on navigation start and emits one change after navigation finish', async () => {
    let currentUrl = 'https://www.youtube.com/watch?v=abc123XYZ_1';
    const callbacks = {
      onNavigationStart: vi.fn(),
      onVideoChanged: vi.fn(),
    };
    const controller = new NavigationController(callbacks, () => currentUrl);
    controller.start();

    document.dispatchEvent(new Event('yt-navigate-start'));
    currentUrl = 'https://www.youtube.com/watch?v=def456XYZ_2';
    document.dispatchEvent(new Event('yt-navigate-finish'));
    await Promise.resolve();

    expect(callbacks.onNavigationStart).toHaveBeenCalledOnce();
    expect(callbacks.onVideoChanged).toHaveBeenCalledOnce();
    expect(callbacks.onVideoChanged).toHaveBeenCalledWith({
      previousVideoId: 'abc123XYZ_1',
      videoId: 'def456XYZ_2',
      url: expect.stringContaining('def456XYZ_2'),
    });

    await controller.dispose();
  });

  it('does not emit for same-video updates', async () => {
    const currentUrl = 'https://www.youtube.com/watch?v=abc123XYZ_1';
    const callbacks = {
      onNavigationStart: vi.fn(),
      onVideoChanged: vi.fn(),
    };
    const controller = new NavigationController(callbacks, () => currentUrl);
    controller.start();

    document.dispatchEvent(new Event('yt-navigate-finish'));
    await Promise.resolve();

    expect(callbacks.onVideoChanged).not.toHaveBeenCalled();
    await controller.dispose();
  });
});
