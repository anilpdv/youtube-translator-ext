import { describe, expect, it } from 'vitest';
import { ApplicationController } from '../../app/ApplicationController';
import { DEFAULT_SETTINGS } from '../../settings/DefaultSettings';

describe('ApplicationController session ownership', () => {
  it('does not allow a cancelled session to commit results', () => {
    const application = new ApplicationController(DEFAULT_SETTINGS);
    const firstSession = application.createTranslationSession({
      videoId: 'video-one',
      targetLanguage: 'te',
      providerId: 'gemini',
    });

    application.cancelActiveSession('Video changed');
    application.createTranslationSession({
      videoId: 'video-two',
      targetLanguage: 'te',
      providerId: 'gemini',
    });

    if (application.isSessionCurrent(firstSession.id)) {
      application.store.update({
        translatedTrack: [
          {
            id: 'old',
            sourceText: 'Old translation',
            translatedText: 'Old translation',
            startMs: 0,
            endMs: 1_000,
          },
        ],
      });
    }

    expect(application.store.getSnapshot().translatedTrack).toEqual([]);
  });
});
