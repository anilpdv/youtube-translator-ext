import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateBatch, isBuiltinAIAvailable } from '../../utils/translationEngine';
import { DEFAULT_SETTINGS, ExtensionSettings, TranscriptSegment } from '../../utils/types';

const segments: TranscriptSegment[] = [
  { start: 0, dur: 3, text: 'Hello, how are you?' },
  { start: 3, dur: 3, text: 'The sky is blue.' },
];

const settings: ExtensionSettings = { ...DEFAULT_SETTINGS };

// ─── isBuiltinAIAvailable ─────────────────────────────────────────────────────
describe('isBuiltinAIAvailable', () => {
  it('returns true when window.Translator is present', () => {
    expect(isBuiltinAIAvailable()).toBe(true);
  });

  it('returns false when window.Translator is absent', () => {
    const original = (self as any).Translator;
    delete (self as any).Translator;
    expect(isBuiltinAIAvailable()).toBe(false);
    (self as any).Translator = original;
  });
});

// ─── translateBatch — Built-in AI ─────────────────────────────────────────────
describe('translateBatch (builtin provider)', () => {
  it('returns empty array for empty input', async () => {
    const result = await translateBatch([], settings, 'Test');
    expect(result).toEqual([]);
  });

  it('translates via Built-in AI when available', async () => {
    const result = await translateBatch(segments, { ...settings, provider: 'builtin', targetLanguage: 'Spanish' }, 'Test');
    expect(result).toHaveLength(2);
    result.forEach((r) => {
      expect(r.translatedText).toBeTruthy();
      expect(r.translatedText).toContain('[translated]');
    });
  });

  it('preserves segment timing metadata', async () => {
    const result = await translateBatch(segments, { ...settings, provider: 'builtin', targetLanguage: 'Spanish' }, 'Test');
    expect(result[0].start).toBe(0);
    expect(result[0].dur).toBe(3);
    expect(result[1].start).toBe(3);
  });
});

// ─── translateBatch — Gemini fallback ─────────────────────────────────────────
describe('translateBatch (gemini provider)', () => {
  const geminiSettings: ExtensionSettings = {
    ...DEFAULT_SETTINGS,
    provider: 'gemini',
    apiKey: 'test-gemini-key',
    targetLanguage: 'Spanish',
  };

  // Remove built-in AI so it doesn't intercept
  beforeEach(() => {
    delete (self as any).Translator;
  });

  afterEach(() => {
    (self as any).Translator = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn().mockResolvedValue({
        translate: vi.fn((t: string) => Promise.resolve(`[translated] ${t}`)),
        destroy: vi.fn(),
      }),
    };
  });

  it('calls Gemini API with correct model and key', async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  { id: 0, translated: 'Hola, ¿cómo estás?' },
                  { id: 1, translated: 'El cielo es azul.' },
                ]),
              },
            ],
          },
        },
      ],
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await translateBatch(segments, geminiSettings, 'My Video');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result[0].translatedText).toBe('Hola, ¿cómo estás?');
    expect(result[1].translatedText).toBe('El cielo es azul.');
  });

  it('falls back to next Gemini model on HTTP error', async () => {
    // First model fails
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: { message: 'Rate limit' } }) })
      // Second model succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        { id: 0, translated: 'Bonjour' },
                        { id: 1, translated: 'Le ciel est bleu.' },
                      ]),
                    },
                  ],
                },
              },
            ],
          }),
      });

    const result = await translateBatch(segments, geminiSettings, 'My Video');
    expect(result[0].translatedText).toBe('Bonjour');
  });

  it('throws when all providers fail', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    const noKeySettings: ExtensionSettings = { ...DEFAULT_SETTINGS, provider: 'gemini', apiKey: '', targetLanguage: 'Spanish' };
    await expect(translateBatch(segments, noKeySettings, '')).rejects.toThrow();
  });
});

// ─── translateBatch — OpenRouter ──────────────────────────────────────────────
describe('translateBatch (openrouter provider)', () => {
  const orSettings: ExtensionSettings = {
    ...DEFAULT_SETTINGS,
    provider: 'openrouter',
    openrouterKey: 'sk-or-test',
    targetLanguage: 'Spanish',
  };

  beforeEach(() => {
    delete (self as any).Translator;
  });

  afterEach(() => {
    (self as any).Translator = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn().mockResolvedValue({
        translate: vi.fn((t: string) => Promise.resolve(`[translated] ${t}`)),
        destroy: vi.fn(),
      }),
    };
  });

  it('calls OpenRouter with Authorization header', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { id: 0, translated: 'Hola' },
                  { id: 1, translated: 'El cielo es azul.' },
                ]),
              },
            },
          ],
        }),
    });

    await translateBatch(segments, orSettings, 'Title');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-or-test',
        }),
      })
    );
  });
});

// ─── translateBatch — Ollama provider ─────────────────────────────────────────
describe('translateBatch (ollama provider)', () => {
  const ollamaSettings: ExtensionSettings = {
    ...DEFAULT_SETTINGS,
    provider: 'ollama',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'qwen2.5:0.5b',
    targetLanguage: 'Spanish',
  };

  beforeEach(() => {
    delete (self as any).Translator;
  });

  afterEach(() => {
    (self as any).Translator = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn().mockResolvedValue({
        translate: vi.fn((t: string) => Promise.resolve(`[translated] ${t}`)),
        destroy: vi.fn(),
      }),
    };
  });

  it('calls Ollama /api/generate endpoint with stream: false and format: json', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          response: JSON.stringify([
            { id: 0, translated: 'Hola, ¿cómo estás?' },
            { id: 1, translated: 'El cielo es azul.' },
          ]),
        }),
    });

    const result = await translateBatch(segments, ollamaSettings, 'My Video');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"model":"qwen2.5:0.5b"'),
      })
    );
    expect(result[0].translatedText).toBe('Hola, ¿cómo estás?');
    expect(result[1].translatedText).toBe('El cielo es azul.');
  });
});

// ─── translateBatch — Chrome Prompt API (ai.languageModel) ───────────────────
describe('translateBatch (Prompt API fallback)', () => {
  beforeEach(() => {
    delete (self as any).Translator;
  });

  afterEach(() => {
    delete (self as any).ai;
    (self as any).Translator = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn().mockResolvedValue({
        translate: vi.fn((t: string) => Promise.resolve(`[translated] ${t}`)),
        destroy: vi.fn(),
      }),
    };
  });

  it('translates via window.ai.languageModel when Translator API is not available', async () => {
    const mockPrompt = vi.fn().mockResolvedValue(
      JSON.stringify([
        { id: 0, translated: 'Bonjour, comment allez-vous?' },
        { id: 1, translated: 'Le ciel est bleu.' },
      ])
    );
    (self as any).ai = {
      languageModel: {
        create: vi.fn().mockResolvedValue({
          prompt: mockPrompt,
          destroy: vi.fn(),
        }),
      },
    };

    const result = await translateBatch(
      segments,
      { ...DEFAULT_SETTINGS, provider: 'builtin', targetLanguage: 'French' },
      'Test Video'
    );
    expect(result[0].translatedText).toBe('Bonjour, comment allez-vous?');
    expect(result[1].translatedText).toBe('Le ciel est bleu.');
  });
});

// ─── Language equivalence fast path ──────────────────────────────────────────
describe('translateBatch (same language equivalence)', () => {
  it('returns original segments without calling fetch or AI when source and target match', async () => {
    const result = await translateBatch(
      segments,
      { ...DEFAULT_SETTINGS, sourceLanguage: 'en', targetLanguage: 'English' },
      ''
    );
    expect(result).toHaveLength(2);
    expect(result[0].translatedText).toBe('Hello, how are you?');
    expect(result[1].translatedText).toBe('The sky is blue.');
  });
});
