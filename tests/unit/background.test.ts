import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as engineModule from '../../utils/translationEngine';
import { DEFAULT_SETTINGS } from '../../utils/types';

describe('Background Service Worker Message Handler', () => {
  let messageListener: any = null;

  beforeEach(async () => {
    vi.clearAllMocks();
    messageListener = null;

    (chrome.runtime.onMessage.addListener as any) = vi.fn((fn) => {
      messageListener = fn;
    });

    (global as any).defineBackground = (fn: any) => ({ main: fn });
    (global as any).browser = {
      runtime: {
        onInstalled: { addListener: vi.fn() },
      },
    };

    const bgModule = await import('../../entrypoints/background');
    if (typeof bgModule.default === 'function') {
      (bgModule.default as any)();
    } else if (bgModule.default?.main) {
      bgModule.default.main();
    }
  });

  it('handles TRANSLATE_BATCH_REQUEST and invokes translateDirectly with context cues', async () => {
    const mockSegments = [{ start: 0, dur: 3, text: 'Hello world' }];
    const prevCue = { start: -3, dur: 3, text: 'Previous' };
    const nextCue = { start: 3, dur: 3, text: 'Next' };
    const mockTranslated = [{ start: 0, dur: 3, text: 'Hello world', translatedText: 'Hola mundo' }];

    vi.spyOn(engineModule, 'translateDirectly').mockResolvedValueOnce(mockTranslated);

    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(messageListener).toBeTruthy();

    const sendResponse = vi.fn();
    const isAsync = messageListener(
      {
        type: 'TRANSLATE_BATCH_REQUEST',
        payload: {
          segments: mockSegments,
          settings: { ...DEFAULT_SETTINGS, provider: 'ollama' },
          contextTitle: 'Test Video',
          previousCue: prevCue,
          nextCue: nextCue,
        },
      },
      {},
      sendResponse
    );

    expect(isAsync).toBe(true);
    await new Promise((r) => setTimeout(r, 10));

    expect(engineModule.translateDirectly).toHaveBeenCalledWith(
      mockSegments,
      expect.objectContaining({ provider: 'ollama' }),
      'Test Video',
      prevCue,
      nextCue
    );
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      data: mockTranslated,
    });
  });

  it('sends error response when translateDirectly fails', async () => {
    vi.spyOn(engineModule, 'translateDirectly').mockRejectedValueOnce(
      new Error('Cannot connect to Ollama')
    );

    expect(messageListener).toBeTruthy();

    const sendResponse = vi.fn();
    messageListener(
      {
        type: 'TRANSLATE_BATCH_REQUEST',
        payload: { segments: [], settings: DEFAULT_SETTINGS, contextTitle: '' },
      },
      {},
      sendResponse
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Cannot connect to Ollama',
    });
  });
});
