import { describe, expect, it } from 'vitest';
import { ApplicationController } from '../../app/ApplicationController';
import { DEFAULT_SETTINGS } from '../../utils/types';

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
            start: 0,
            dur: 1,
            text: 'Old translation',
            translatedText: 'Old translation',
          },
        ],
      });
    }

    expect(application.store.getSnapshot().translatedTrack).toEqual([]);
  });
});
