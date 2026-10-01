import { DEFAULT_SETTINGS } from './DefaultSettings';
import type { ExtensionSettings } from './ExtensionSettings';

const STORAGE_KEY = 'yt_ai_settings';

export async function getSettings(): Promise<ExtensionSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return { ...DEFAULT_SETTINGS };
  }
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const saved = result?.[STORAGE_KEY];
      if (!saved || typeof saved !== 'object') {
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }
      // Old provider selections are deliberately normalized away. They cannot
      // activate the stable Gemini-only workflow.
      resolve({ ...DEFAULT_SETTINGS, ...saved, provider: 'gemini' });
    });
  });
}

export async function saveSettings(
  patch: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const updated = { ...(await getSettings()), ...patch, provider: 'gemini' as const };
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return updated;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => resolve(updated));
  });
}
