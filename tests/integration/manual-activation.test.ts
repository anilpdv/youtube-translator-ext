import { describe, expect, it, vi } from 'vitest';
import { ApplicationController } from '../../app/ApplicationController';
import { DEFAULT_SETTINGS } from '../../utils/types';

describe('manual activation', () => {
  it('starts idle without touching caption, translation, or rendering services', () => {
    const captionExtraction = { discoverTracks: vi.fn(), extract: vi.fn() };
    const translation = { translate: vi.fn() };
    const rendering = { clear: vi.fn(), show: vi.fn(), updateSettings: vi.fn() };
    const application = new ApplicationController(DEFAULT_SETTINGS, {
      captionExtraction: captionExtraction as never,
      translation: translation as never,
      rendering: rendering as never,
    });
    application.start();
    expect(captionExtraction.discoverTracks).not.toHaveBeenCalled();
    expect(captionExtraction.extract).not.toHaveBeenCalled();
    expect(translation.translate).not.toHaveBeenCalled();
    expect(rendering.show).not.toHaveBeenCalled();
    expect(application.store.getSnapshot().activation.requested).toBe(false);
  });

  it('rejects provider work without activation', async () => {
    const application = new ApplicationController(DEFAULT_SETTINGS);
    const session = application.createTranslationSession({ videoId: 'video-a', targetLanguage: 'te', providerId: 'gemini', modelId: 'model' });
    await expect(application.translateCaptions(session, {} as never)).rejects.toMatchObject({ code: 'USER_ACTION_REQUIRED' });
  });
});
