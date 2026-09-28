import { translateDirectly } from '../utils/translationEngine';
import { TranslationGateway } from '../background/TranslationGateway';
import { validateTranslationMessage } from '../background/messages/validateTranslationMessage';
import { GeminiProvider } from '../translation/providers/GeminiProvider';
import { TranslationPromptBuilder } from '../translation/prompts/TranslationPromptBuilder';
import { validateApplicationMessage } from '../background/messages/validateApplicationMessage';

const credentials = {
  getApiKey: async (providerId: string): Promise<string | null> => {
    if (providerId !== 'gemini') return null;
    const result = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get(['yt_ai_settings'], (value) => resolve(value));
    });
    const settings = result.yt_ai_settings;
    if (typeof settings !== 'object' || settings === null) return null;
    const apiKey = (settings as { apiKey?: unknown }).apiKey;
    return typeof apiKey === 'string' && apiKey.trim() ? apiKey : null;
  },
};

const translationGateway = new TranslationGateway(
  new Map([
    [
      'gemini',
      new GeminiProvider(credentials, new TranslationPromptBuilder()),
    ],
  ]),
);

export default defineBackground(() => {
  console.log('[AI Subtitles] Background service worker initialized');

  browser.runtime.onInstalled.addListener(() => {
    console.log('[AI Subtitles] Extension installed');
  });

  // Handle translation requests from content scripts to bypass web page CORS policies
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (validateApplicationMessage(message)) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || !tab.url) {
          sendResponse({
            ok: false,
            error: { code: 'NO_ACTIVE_TAB', message: 'No active browser tab is available.' },
          });
          return;
        }
        let url: URL;
        try {
          url = new URL(tab.url);
        } catch {
          sendResponse({
            ok: false,
            error: { code: 'UNSUPPORTED_PAGE', message: 'Open a supported YouTube video.' },
          });
          return;
        }
        if (!url.hostname.endsWith('youtube.com') || url.pathname !== '/watch') {
          sendResponse({
            ok: false,
            error: { code: 'UNSUPPORTED_PAGE', message: 'Open a supported YouTube video.' },
          });
          return;
        }
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime.lastError || !response) {
            sendResponse({
              ok: false,
              error: { code: 'CONTENT_RUNTIME_UNAVAILABLE', message: 'Refresh the YouTube video tab and try again.' },
            });
            return;
          }
          sendResponse(response);
        });
      });
      return true;
    }
    const typedMessage = validateTranslationMessage(message);
    if (typedMessage?.type === 'translation.cancel-session') {
      translationGateway.cancelSession(typedMessage.sessionId);
      sendResponse({ success: true });
      return false;
    }
    if (typedMessage?.type === 'translation.translate-batch') {
      translationGateway
        .translateBatch(typedMessage)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Translation failed.',
          }),
        );
      return true;
    }
    if (message?.type === 'TRANSLATE_BATCH_REQUEST') {
      const { segments, settings, contextTitle, previousCue, nextCue } = message.payload || {};
      translateDirectly(segments || [], settings, contextTitle || '', previousCue, nextCue)
        .then((translated) => {
          sendResponse({ success: true, data: translated });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err?.message || 'Translation failed in background' });
        });
      return true; // Keep message channel open for asynchronous sendResponse
    }

    if (message?.type === 'GET_OLLAMA_MODELS') {
      const endpoint = message.endpoint || 'http://localhost:11434';
      fetch(`${endpoint.replace(/\/+$/, '')}/api/tags`)
        .then((res) => res.json())
        .then((data) => {
          const models = Array.isArray(data?.models)
            ? data.models.map((m: any) => m.name || m.model).filter(Boolean)
            : [];
          sendResponse({ success: true, models });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err?.message, models: [] });
        });
      return true;
    }
  });
});
