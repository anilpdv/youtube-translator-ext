import { ExtensionSettings, TranscriptSegment, TranslatedSegment } from './types';
import {
  createCueId,
  deduplicateRepeatedPhrases,
  isSoundLabel,
  mergeTranslations,
  translateSoundLabel,
} from './transcript';

// ─── Chrome Built-in AI (Gemini Nano) ────────────────────────────────────────

/** Maps full language names to BCP-47 codes for the Chrome Translator API. */
const LANG_NAME_TO_BCP47: Record<string, string> = {
  English: 'en',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Japanese: 'ja',
  Hindi: 'hi',
  Chinese: 'zh',
  Russian: 'ru',
  Italian: 'it',
  Portuguese: 'pt',
  Korean: 'ko',
  Arabic: 'ar',
};

export function toLanguageCode(nameOrCode: string): string {
  return LANG_NAME_TO_BCP47[nameOrCode] ?? nameOrCode;
}

/** Detects language code from text using browser detector or character/word heuristics */
export async function detectLanguageCode(sampleText: string): Promise<string> {
  if (!sampleText || sampleText.trim().length === 0) return 'en';

  // 1. Chrome Built-in LanguageDetector API (Chrome 131+)
  try {
    const ai = (self as any).ai || (self as any).translation;
    if (ai?.languageDetector?.create) {
      const detector = await ai.languageDetector.create();
      const results = await detector.detect(sampleText);
      detector.destroy?.();
      if (results && results.length > 0 && results[0].detectedLanguage) {
        return results[0].detectedLanguage;
      }
    }
  } catch {}

  // 2. Fast character & vocabulary heuristics
  if (/[ぁ-んァ-ヶー一-龠]/.test(sampleText)) return 'ja';
  if (/[一-龥]/.test(sampleText)) return 'zh';
  if (/[а-яА-ЯёЁ]/.test(sampleText)) return 'ru';
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(sampleText)) return 'ko';
  if (/[؀-ۿ]/.test(sampleText)) return 'ar';
  if (/[ऀ-ॿ]/.test(sampleText)) return 'hi';
  if (/[áéíóúüñ¿¡]|\b(qué|para|con|por|como|pero|este|esta|está|del|las|los|una|uno|son|más|gracias|bueno)\b/i.test(sampleText)) return 'es';
  if (/[àâçéèêëîïôûùüÿœæ]|\b(pour|avec|dans|sur|nous|vous|sont|cette|mais|comme|merci|bonjour)\b/i.test(sampleText)) return 'fr';
  if (/[äöüß]|\b(und|der|die|das|nicht|eine|einer|haben|werden|auch|danke|bitte)\b/i.test(sampleText)) return 'de';
  if (/\b(che|per|con|non|sono|questo|questa|della|degli|come|grazie)\b/i.test(sampleText)) return 'it';
  if (/[ãõ]|\b(para|com|não|são|esta|este|como|mais|pelo|obrigado)\b/i.test(sampleText)) return 'pt';

  return 'en';
}

function isBuiltinAIAvailable(): boolean {
  return (
    typeof (self as any).translation?.createTranslator !== 'undefined' ||
    typeof (self as any).Translator !== 'undefined' ||
    typeof (self as any).ai?.translator?.create !== 'undefined' ||
    typeof (self as any).ai?.languageModel?.create !== 'undefined' ||
    typeof (self as any).ai?.assistant?.create !== 'undefined'
  );
}

export async function translateViaPromptAPI(
  segments: TranscriptSegment[],
  targetLanguage: string,
  contextTitle: string = '',
  previousCue?: TranscriptSegment,
  nextCue?: TranscriptSegment
): Promise<TranslatedSegment[]> {
  const ai = (self as any).ai;
  const lmFactory = ai?.languageModel || ai?.assistant;
  if (!lmFactory?.create) {
    throw new Error('Chrome Prompt API (ai.languageModel) not available');
  }

  const prompt = buildPrompt(segments, targetLanguage, contextTitle, previousCue, nextCue);
  const session = await lmFactory.create({
    systemPrompt: `You are an expert subtitle translator. Translate user-provided transcript segments to ${targetLanguage}. Output ONLY a valid JSON array of objects with keys "id" and "translated". Do not include markdown ticks or commentary.`,
  });

  try {
    const rawResponse = await session.prompt(prompt);
    return parseTranslationResponse(rawResponse, segments);
  } finally {
    session.destroy?.();
  }
}

const translatorCache = new Map<string, any>();

async function getOrCreateTranslator(src: string, tgt: string) {
  const cacheKey = `${src}->${tgt}`;
  if (translatorCache.has(cacheKey)) {
    return translatorCache.get(cacheKey);
  }

  const translatorApi = (self as any).translation || (self as any).Translator || (self as any).ai?.translator;
  if (!translatorApi) return null;

  const checkAvailability = translatorApi.canTranslate || translatorApi.availability;
  if (typeof checkAvailability === 'function') {
    const status = await checkAvailability({ sourceLanguage: src, targetLanguage: tgt });
    if (status === 'no') return null;
  }

  const createTranslator = translatorApi.createTranslator || translatorApi.create;
  if (!createTranslator) return null;

  const translator = await createTranslator({ sourceLanguage: src, targetLanguage: tgt });
  translatorCache.set(cacheKey, translator);
  return translator;
}

async function translateViaBuiltinAI(
  segments: TranscriptSegment[],
  sourceLang: string,
  targetLang: string,
  contextTitle: string = '',
  previousCue?: TranscriptSegment,
  nextCue?: TranscriptSegment
): Promise<TranslatedSegment[]> {
  const srcCode = sourceLang === 'auto' ? await detectLanguageCode(segments[0]?.text || '') : toLanguageCode(sourceLang);
  const tgtCode = toLanguageCode(targetLang);

  const translator = await getOrCreateTranslator(srcCode, tgtCode);
  if (translator) {
    const translatedResults: TranslatedSegment[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (isSoundLabel(seg.text)) {
        translatedResults.push({
          ...seg,
          translatedText: translateSoundLabel(seg.text),
          translationStatus: 'translated',
        });
        continue;
      }

      try {
        const trans = await translator.translate(seg.text);
        translatedResults.push({
          ...seg,
          translatedText: deduplicateRepeatedPhrases(trans?.trim() || seg.text),
          translationStatus: 'translated',
        });
      } catch {
        translatedResults.push({
          ...seg,
          translatedText: seg.text,
          translationStatus: 'failed',
        });
      }
    }
    return translatedResults;
  }

  // Fallback to Prompt API (Gemini Nano) within Built-in AI tier
  return await translateViaPromptAPI(segments, targetLang, contextTitle, previousCue, nextCue);
}

function parseTranslationResponse(rawText: string, segments: TranscriptSegment[]): TranslatedSegment[] {
  const extractedList: Array<{ id: string; translated: string }> = [];

  // Pre-fill sound labels from deterministic dictionary
  segments.forEach((seg, idx) => {
    const cueId = seg.id || String(idx);
    if (isSoundLabel(seg.text)) {
      extractedList.push({ id: cueId, translated: translateSoundLabel(seg.text) });
    }
  });

  try {
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed: any = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      parsed.forEach((item, index) => {
        const itemObj = typeof item === 'string' ? { translated: item } : item;
        const text = deduplicateRepeatedPhrases(
          (itemObj?.translated || itemObj?.text || (typeof item === 'string' ? item : '')).trim()
        );
        if (text) {
          const cueId = segments[index]?.id || String(index);
          if (itemObj?.id !== undefined) {
            extractedList.push({ id: String(itemObj.id), translated: text });
          }
          extractedList.push({ id: String(index), translated: text });
          if (cueId) {
            extractedList.push({ id: cueId, translated: text });
          }
        }
      });
    } else if (parsed && typeof parsed === 'object') {
      const arr = parsed.translations || parsed.segments || parsed.subtitles;
      if (Array.isArray(arr)) {
        arr.forEach((item: any, index: number) => {
          const itemObj = typeof item === 'string' ? { translated: item } : item;
          const text = deduplicateRepeatedPhrases(
            (itemObj?.translated || itemObj?.text || (typeof item === 'string' ? item : '')).trim()
          );
          if (text) {
            const cueId = segments[index]?.id || String(index);
            if (itemObj?.id !== undefined) {
              extractedList.push({ id: String(itemObj.id), translated: text });
            }
            extractedList.push({ id: String(index), translated: text });
            if (cueId) {
              extractedList.push({ id: cueId, translated: text });
            }
          }
        });
      } else if (parsed.translation && segments.length === 1) {
        const cueId = segments[0]?.id || '0';
        extractedList.push({
          id: cueId,
          translated: deduplicateRepeatedPhrases(String(parsed.translation).trim()),
        });
      } else {
        Object.entries(parsed).forEach(([key, val]) => {
          if (typeof val === 'string') {
            const num = Number(key);
            const cueId = !isNaN(num) && segments[num] ? (segments[num].id || String(num)) : key;
            extractedList.push({ id: cueId, translated: deduplicateRepeatedPhrases(val.trim()) });
          }
        });
      }
    }
  } catch {
    if (segments.length === 1 && rawText && !rawText.startsWith('{') && !rawText.startsWith('[')) {
      const cueId = segments[0]?.id || '0';
      extractedList.push({ id: cueId, translated: deduplicateRepeatedPhrases(rawText.trim()) });
    }
  }

  return mergeTranslations(segments, extractedList);
}

function buildPrompt(
  segments: TranscriptSegment[],
  targetLanguage: string,
  contextTitle: string,
  previousCue?: TranscriptSegment,
  nextCue?: TranscriptSegment
): string {
  const inputData = segments.map((s, idx) => ({ id: s.id || idx, text: s.text }));
  return `You are an expert subtitle translator.
Video Title: "${contextTitle || 'Video'}"
Target Language: ${targetLanguage}
${previousCue ? `Previous Line Context: "${previousCue.text}"` : ''}
${nextCue ? `Next Line Context: "${nextCue.text}"` : ''}

Instructions:
1. Translate each subtitle line into natural, idiomatic on-screen subtitle phrasing in ${targetLanguage}.
2. Use neighboring context ONLY to resolve ambiguity and pronouns; do NOT merge lines or add facts absent from the source.
3. Preserve bracketed sound descriptions and translate them appropriately (e.g. [ため息] -> [Sighing], [拍手] -> [Applause]).
4. Return a valid JSON array with EXACTLY ${segments.length} objects, each with "id" matching the input and "translated" (string).

Subtitles to translate:
${JSON.stringify(inputData)}`;
}

// ─── Gemini API ───────────────────────────────────────────────────────────────

async function translateViaGemini(
  segments: TranscriptSegment[],
  targetLanguage: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash',
  contextTitle: string = '',
  previousCue?: TranscriptSegment,
  nextCue?: TranscriptSegment
): Promise<TranslatedSegment[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = buildPrompt(segments, targetLanguage, contextTitle, previousCue, nextCue);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini (${model}): ${err?.error?.message || response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  return parseTranslationResponse(rawText, segments);
}

// ─── OpenRouter API ───────────────────────────────────────────────────────────

async function translateViaOpenRouter(
  segments: TranscriptSegment[],
  targetLanguage: string,
  apiKey: string,
  model: string = 'openai/gpt-4o-mini',
  contextTitle: string = '',
  previousCue?: TranscriptSegment,
  nextCue?: TranscriptSegment
): Promise<TranslatedSegment[]> {
  const prompt = buildPrompt(segments, targetLanguage, contextTitle, previousCue, nextCue);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://youtube.com',
      'X-Title': 'YouTube AI Subtitle Translator',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter (${model}): ${err?.error?.message || response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || '[]';
  return parseTranslationResponse(rawText, segments);
}

// ─── Local Ollama API (Free, On-Device) ───────────────────────────────────────

export async function translateViaOllama(
  segments: TranscriptSegment[],
  targetLanguage: string,
  endpoint: string = 'http://localhost:11434',
  model: string = 'qwen2.5:0.5b',
  contextTitle: string = '',
  previousCue?: TranscriptSegment,
  nextCue?: TranscriptSegment
): Promise<TranslatedSegment[]> {
  const prompt = buildPrompt(segments, targetLanguage, contextTitle, previousCue, nextCue);
  const url = `${endpoint.replace(/\/+$/, '')}/api/generate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'qwen2.5:0.5b',
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Ollama (${model}): ${err?.error || response.statusText || response.status}`);
  }

  const data = await response.json();
  const rawText = data.response || '[]';
  return parseTranslationResponse(rawText, segments);
}

// ─── Direct Translation Pipeline ──────────────────────────────────────────────

/**
 * Executes the translation cascade directly in the current JavaScript context.
 * Auto-cascades: Built-in AI (Translator/Prompt API) → Ollama → Gemini → OpenRouter.
 */
export async function translateDirectly(
  segments: TranscriptSegment[],
  settings: ExtensionSettings,
  contextTitle: string = '',
  previousCue?: TranscriptSegment,
  nextCue?: TranscriptSegment
): Promise<TranslatedSegment[]> {
  if (!segments || segments.length === 0) return [];

  const {
    provider,
    sourceLanguage,
    targetLanguage,
    apiKey,
    openrouterKey,
    openrouterModel,
    ollamaEndpoint,
    ollamaModel,
  } = settings;

  // Language equivalence check (e.g. source en -> target en)
  const sample = segments.slice(0, 5).map((s) => s.text).join(' ');
  const detectedSrc = (sourceLanguage === 'auto' || !sourceLanguage) ? await detectLanguageCode(sample) : toLanguageCode(sourceLanguage);
  if (toLanguageCode(detectedSrc) === toLanguageCode(targetLanguage || 'English')) {
    return segments.map((s) => ({ ...s, translatedText: s.text, translationStatus: 'translated' }));
  }

  let results: TranslatedSegment[] | null = null;

  // Tier 1: Chrome Built-in AI (free, on-device Gemini Nano / Translator API)
  if (provider === 'builtin' || (!apiKey && !openrouterKey && provider !== 'ollama')) {
    if (isBuiltinAIAvailable()) {
      try {
        console.log('[AI Subtitles] Using Chrome Built-in AI (free on-device)');
        results = await translateViaBuiltinAI(segments, sourceLanguage || 'auto', targetLanguage || 'English', contextTitle, previousCue, nextCue);
      } catch (err: any) {
        console.warn('[AI Subtitles] Built-in AI failed:', err?.message);
        if (provider === 'builtin' && !apiKey && !openrouterKey) {
          try {
            results = await translateViaOllama(segments, targetLanguage || 'English', ollamaEndpoint, ollamaModel, contextTitle, previousCue, nextCue);
          } catch {}
        }
      }
    }
  }

  // Tier 2: Local Ollama (free, on-device)
  if (!results && provider === 'ollama') {
    try {
      console.log(`[AI Subtitles] Using Local Ollama (${ollamaModel || 'qwen2.5:0.5b'})`);
      results = await translateViaOllama(segments, targetLanguage || 'English', ollamaEndpoint, ollamaModel, contextTitle, previousCue, nextCue);
    } catch (err: any) {
      console.warn('[AI Subtitles] Ollama failed:', err?.message);
      if (!apiKey && !openrouterKey) {
        throw new Error(`Ollama translation failed: ${err?.message || 'Check if Ollama is running at ' + (ollamaEndpoint || 'http://localhost:11434')}`);
      }
    }
  }

  // Tier 3: Gemini API
  if (!results && apiKey) {
    for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']) {
      try {
        console.log(`[AI Subtitles] Using Gemini (${model})`);
        results = await translateViaGemini(segments, targetLanguage || 'English', apiKey, model, contextTitle, previousCue, nextCue);
        break;
      } catch (err: any) {
        console.warn(`[AI Subtitles] Gemini (${model}) failed:`, err?.message);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  // Tier 4: OpenRouter
  if (!results && openrouterKey) {
    for (const model of [openrouterModel || 'openai/gpt-4o-mini', 'google/gemini-2.0-flash-001', 'meta-llama/llama-3.3-70b-instruct']) {
      try {
        console.log(`[AI Subtitles] Using OpenRouter (${model})`);
        results = await translateViaOpenRouter(segments, targetLanguage || 'English', openrouterKey, model, contextTitle, previousCue, nextCue);
        break;
      } catch (err: any) {
        console.warn(`[AI Subtitles] OpenRouter (${model}) failed:`, err?.message);
      }
    }
  }

  if (!results) {
    if (provider === 'ollama') {
      throw new Error(`Cannot connect to Ollama at ${ollamaEndpoint || 'http://localhost:11434'}. Ensure Ollama is running ('ollama run ${ollamaModel || 'qwen2.5:0.5b'}').`);
    }
    if (!apiKey && !openrouterKey) {
      throw new Error('Please select a translation method in the extension popup: Chrome Built-in AI (free), Local Ollama (free), or enter a Gemini API Key.');
    }
    throw new Error('Translation failed: Please verify your Gemini API key in the extension settings.');
  }

  // Retry any failed cues individually
  const missingCues = results.filter((r) => r.translationStatus === 'failed');
  if (missingCues.length > 0 && segments.length > 1) {
    for (const missing of missingCues) {
      try {
        const singleResult = await translateDirectly([missing], settings, contextTitle);
        if (singleResult.length > 0 && singleResult[0].translatedText !== missing.text) {
          const idx = results.findIndex((r) => r.id === missing.id);
          if (idx >= 0) {
            results[idx] = singleResult[0];
          }
        }
      } catch {}
    }
  }

  return results;
}

// ─── Public API (With Background Delegation) ─────────────────────────────────

/**
 * Translate a batch of transcript segments.
 * When called from a content script, dispatches to the background service worker
 * to bypass web-origin CORS restrictions on local APIs (such as Ollama on localhost:11434).
 */
export async function translateBatch(
  segments: TranscriptSegment[],
  settings: ExtensionSettings,
  contextTitle: string = '',
  previousCue?: TranscriptSegment,
  nextCue?: TranscriptSegment
): Promise<TranslatedSegment[]> {
  if (!segments || segments.length === 0) return [];

  // Check if we are in a content script / browser DOM environment
  const isContentScript = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  if (isContentScript && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'TRANSLATE_BATCH_REQUEST',
            payload: { segments, settings, contextTitle, previousCue, nextCue },
          },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ fallback: true, error: chrome.runtime.lastError.message });
            } else {
              resolve(res);
            }
          }
        );
      });

      if (response && response.success && Array.isArray(response.data)) {
        return response.data;
      }
      if (response && response.error && !response.fallback) {
        throw new Error(response.error);
      }
    } catch (err: any) {
      if (err?.message && !err.message.includes('Receiving end does not exist') && !err.message.includes('Extension context invalidated')) {
        throw err;
      }
      console.warn('[AI Subtitles] Background dispatch unavailable, executing locally:', err?.message);
    }
  }

  // Direct execution (background worker, popup, or test environment)
  return await translateDirectly(segments, settings, contextTitle, previousCue, nextCue);
}

export { isBuiltinAIAvailable };
