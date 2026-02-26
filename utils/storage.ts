import { DEFAULT_SETTINGS, ExtensionSettings } from './types';

export const getSettings = async (): Promise<ExtensionSettings> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['yt_ai_settings'], (result) => {
        if (result && result.yt_ai_settings) {
          // Merge saved settings with defaults (handles new fields gracefully)
          const loaded: ExtensionSettings = { ...DEFAULT_SETTINGS, ...result.yt_ai_settings };
          // Migrate legacy voice provider values
          if ((loaded.provider as string) === 'openrouter') loaded.provider = 'openrouter';
          resolve(loaded);
        } else {
          resolve({ ...DEFAULT_SETTINGS });
        }
      });
    } else {
      resolve({ ...DEFAULT_SETTINGS });
    }
  });
};

export const saveSettings = async (settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> => {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ yt_ai_settings: updated }, () => {
        resolve(updated);
      });
    } else {
      resolve(updated);
    }
  });
};
