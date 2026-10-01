import { describe, expect, it, vi } from 'vitest';
import { CaptionFetcher } from '../../captions/fetching/CaptionFetcher';
import { DEFAULT_CAPTION_LIMITS } from '../../captions/domain/CaptionLimits';

const track = {
  id: 'en',
  languageCode: 'en',
  languageName: 'English',
  kind: 'automatic' as const,
  isDefault: true,
  isTranslatable: true,
  baseUrl: 'https://www.youtube.com/api/timedtext?v=fixture',
};

describe('CaptionFetcher', () => {
  it('falls back when YouTube returns an empty JSON3 response', async () => {
    const requests: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: URL | string) => {
      const url = String(input);
      requests.push(url);
      if (url.includes('fmt=json3')) {
        return new Response('', { status: 200 });
      }
      return new Response(
        'WEBVTT\n\n00:00.000 --> 00:01.500\nHello',
        { status: 200, headers: { 'content-type': 'text/vtt' } },
      );
    }));

    const response = await new CaptionFetcher({
      timeoutMs: 5_000,
      limits: DEFAULT_CAPTION_LIMITS,
    }).fetch(track);

    expect(response.format).toBe('webvtt');
    expect(requests.map((url) => new URL(url).searchParams.get('fmt')))
      .toEqual(['json3', 'srv3']);
  });

  it('parses srv3 fallback responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: URL | string) => {
      const url = String(input);
      if (url.includes('fmt=json3')) return new Response('', { status: 200 });
      return new Response(
        '<transcript><text start="0" dur="1.5">Hello &amp; world</text></transcript>',
        { status: 200, headers: { 'content-type': 'text/xml' } },
      );
    }));

    const response = await new CaptionFetcher({
      timeoutMs: 5_000,
      limits: DEFAULT_CAPTION_LIMITS,
    }).fetch(track);

    expect(response.format).toBe('srv3');
    expect(response.body).toContain('Hello');
  });
});
