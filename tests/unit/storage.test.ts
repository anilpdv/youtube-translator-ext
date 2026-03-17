import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, saveSettings } from '../../utils/storage';
import { DEFAULT_SETTINGS } from '../../utils/types';

describe('storage', () => {
  describe('getSettings', () => {
    it('returns DEFAULT_SETTINGS when chrome storage is empty', async () => {
      (chrome.storage.local.get as any).mockImplementation((_keys: string[], cb: (r: any) => void) => cb({}));
      const settings = await getSettings();
      expect(settings.provider).toBe('youtube');
      expect(settings.targetLanguage).toBe('English');
      expect(settings.autoTranslate).toBe(true);
    });

    it('merges saved settings with defaults (new fields get defaults)', async () => {
      const saved = { provider: 'gemini', targetLanguage: 'Spanish' };
      (chrome.storage.local.get as any).mockImplementation((_keys: string[], cb: (r: any) => void) =>
        cb({ yt_ai_settings: saved })
      );
      const settings = await getSettings();
      expect(settings.provider).toBe('gemini');
      expect(settings.targetLanguage).toBe('Spanish');
      // New fields from DEFAULT_SETTINGS are present
      expect(settings.subtitleFontColor).toBe(DEFAULT_SETTINGS.subtitleFontColor);
    });

    it('does NOT inject hardcoded API keys', async () => {
      (chrome.storage.local.get as any).mockImplementation((_keys: string[], cb: (r: any) => void) => cb({}));
      const settings = await getSettings();
      expect(settings.apiKey).toBe('');
      expect(settings.openrouterKey).toBe('');
    });
  });

  describe('saveSettings', () => {
    it('persists partial settings merged with current', async () => {
      (chrome.storage.local.get as any).mockImplementation((_keys: string[], cb: (r: any) => void) => cb({}));
      (chrome.storage.local.set as any).mockImplementation((data: any, cb: () => void) => cb());

      const result = await saveSettings({ targetLanguage: 'French' });
      expect(result.targetLanguage).toBe('French');
      expect(result.provider).toBe('youtube'); // default preserved
    });

    it('calls chrome.storage.local.set with merged settings', async () => {
      (chrome.storage.local.get as any).mockImplementation((_keys: string[], cb: (r: any) => void) => cb({}));
      const setCalls: any[] = [];
      (chrome.storage.local.set as any).mockImplementation((data: any, cb: () => void) => {
        setCalls.push(data);
        cb();
      });

      await saveSettings({ autoTranslate: false });
      expect(setCalls[0].yt_ai_settings.autoTranslate).toBe(false);
    });
  });
});
