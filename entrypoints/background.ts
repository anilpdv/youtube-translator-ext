import { translateDirectly } from '../utils/translationEngine';

export default defineBackground(() => {
  console.log('[AI Subtitles] Background service worker initialized');

  browser.runtime.onInstalled.addListener(() => {
    console.log('[AI Subtitles] Extension installed');
  });

  // Handle translation requests from content scripts to bypass web page CORS policies
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
