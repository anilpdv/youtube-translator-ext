import { describe, expect, it, vi } from 'vitest';
import { CaptionFetcher } from '../../captions/fetching/CaptionFetcher';
import { DEFAULT_CAPTION_LIMITS } from '../../captions/domain/CaptionLimits';

describe('caption transport regression', () => {
  it('preserves the signed track URL while removing source tlang and requesting JSON3', async () => {
    let requestUrl = '';
    vi.stubGlobal('fetch', vi.fn(async (input: URL | string) => {
      requestUrl = String(input);
      return new Response(
        JSON.stringify({
          events: [{ tStartMs: 0, dDurationMs: 1500, segs: [{ utf8: 'Hello' }] }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }));

    const result = await new CaptionFetcher({
      timeoutMs: 5_000,
      limits: DEFAULT_CAPTION_LIMITS,
    }).fetch({
      id: 'en',
      languageCode: 'en',
      languageName: 'English',
      kind: 'automatic',
      isDefault: true,
      isTranslatable: true,
      baseUrl: 'https://www.youtube.com/api/timedtext?lang=en&tlang=fr&fmt=srv3&expire=9999999999&signature=fixture',
    });

    const url = new URL(requestUrl);
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.searchParams.get('fmt')).toBe('json3');
    expect(url.searchParams.has('tlang')).toBe(false);
    expect(url.searchParams.has('expire')).toBe(true);
    expect(url.searchParams.has('signature')).toBe(true);
    expect(result.body.length).toBeGreaterThan(0);
  });
});
