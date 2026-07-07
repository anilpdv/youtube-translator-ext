import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// ─── Chrome API mock ──────────────────────────────────────────────────────────
const mockStorage: Record<string, any> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn((keys: string[], cb: (result: any) => void) => cb(mockStorage)),
      set: vi.fn((data: Record<string, any>, cb?: () => void) => {
        Object.assign(mockStorage, data);
        cb?.();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn((msg: any, cb?: any) => {
      if (typeof cb === 'function') cb({ fallback: true });
      return Promise.resolve({});
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

(global as any).chrome = chromeMock;

// ─── Chrome Built-in AI mock ──────────────────────────────────────────────────
(global as any).Translator = {
  availability: vi.fn().mockResolvedValue('readily'),
  create: vi.fn().mockResolvedValue({
    translate: vi.fn((text: string) => Promise.resolve(`[translated] ${text}`)),
    destroy: vi.fn(),
  }),
};

// ─── fetch mock ───────────────────────────────────────────────────────────────
global.fetch = vi.fn();

// ─── Reset between tests ──────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (global as any).chrome.runtime.lastError = null;
});
