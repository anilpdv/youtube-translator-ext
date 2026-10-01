import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('Background Service Worker Message Handler', () => {
  let messageListener: any = null;

  beforeEach(async () => {
    vi.clearAllMocks();
    messageListener = null;
    (chrome.runtime.onMessage.addListener as any) = vi.fn((fn: any) => {
      messageListener = fn;
    });
    (chrome.tabs.query as any) = vi.fn((_query: unknown, callback: (tabs: any[]) => void) =>
      callback([{ id: 7, url: 'https://www.youtube.com/watch?v=video' }]),
    );
    (chrome.tabs.sendMessage as any) = vi.fn((_tabId: number, _message: unknown, callback: (response: unknown) => void) =>
      callback({ ok: true, data: { status: 'idle' } }),
    );
    (global as any).defineBackground = (fn: any) => ({ main: fn });
    (global as any).browser = {
      runtime: { onInstalled: { addListener: vi.fn() } },
    };
    const bgModule = await import('../../entrypoints/background');
    if (typeof bgModule.default === 'function') (bgModule.default as any)();
    else if (bgModule.default?.main) bgModule.default.main();
  });

  it('forwards validated application commands to the active YouTube content runtime', () => {
    expect(messageListener).toBeTruthy();
    const sendResponse = vi.fn();
    const isAsync = messageListener({ type: 'application.get-state' }, {}, sendResponse);
    expect(isAsync).toBe(true);
    expect(chrome.tabs.query).toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'application.get-state' }, expect.any(Function));
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, data: { status: 'idle' } });
  });

  it('rejects application commands when there is no active YouTube tab', () => {
    (chrome.tabs.query as any).mockImplementation((_query: unknown, callback: (tabs: any[]) => void) => callback([]));
    const sendResponse = vi.fn();
    messageListener({ type: 'application.get-state' }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: { code: 'NO_ACTIVE_TAB', message: 'No active browser tab is available.' },
    });
  });
});
