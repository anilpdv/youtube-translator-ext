import { describe, expect, it } from 'vitest';
import { CaptionTrackDiscovery } from '../../captions/discovery/CaptionTrackDiscovery';
import { selectCaptionTrack } from '../../captions/discovery/selectCaptionTrack';
import { Json3CaptionParser } from '../../captions/parsing/Json3CaptionParser';
import { WebVttCaptionParser } from '../../captions/parsing/WebVttCaptionParser';
import { CaptionNormalizer } from '../../captions/normalization/CaptionNormalizer';
import { CaptionValidator } from '../../captions/validation/CaptionValidator';
import { DEFAULT_CAPTION_LIMITS } from '../../captions/domain/CaptionLimits';

describe('caption extraction foundations', () => {
  it('discovers and selects manual tracks defensively', async () => {
    const discovery = new CaptionTrackDiscovery({
      read: async () => ({
        captions: {
          playerCaptionsTracklistRenderer: {
            captionTracks: [
              {
                baseUrl: 'https://www.youtube.com/api/timedtext?v=1',
                languageCode: 'en',
                name: { simpleText: 'English' },
                vssId: '.en',
                kind: 'asr',
                isTranslatable: true,
              },
              {
                baseUrl: 'https://www.youtube.com/api/timedtext?v=2',
                languageCode: 'en',
                name: { simpleText: 'English' },
                vssId: 'en',
                isTranslatable: true,
              },
            ],
          },
        },
      }),
    });

    const tracks = await discovery.discover();
    expect(selectCaptionTrack(tracks, { languageCode: 'en', preferManual: true }).kind)
      .toBe('manual');
  });

  it('keeps the first discovered track as the default source track', async () => {
    const discovery = new CaptionTrackDiscovery({
      read: async () => ({
        captions: {
          playerCaptionsTracklistRenderer: {
            captionTracks: [
              {
                baseUrl: 'https://www.youtube.com/api/timedtext?v=automatic',
                languageCode: 'hi',
                name: { simpleText: 'Hindi (auto-generated)' },
                vssId: 'hi',
                kind: 'asr',
                isTranslatable: true,
              },
              {
                baseUrl: 'https://www.youtube.com/api/timedtext?v=manual',
                languageCode: 'hi',
                name: { simpleText: 'Hindi' },
                vssId: 'hi-manual',
                isTranslatable: true,
              },
            ],
          },
        },
      }),
    });
    const tracks = await discovery.discover();
    expect(tracks.find((track) => track.isDefault)?.id).toBe('hi');
  });

  it('parses JSON3 and normalizes entities and missing duration', () => {
    const raw = new Json3CaptionParser().parse(
      JSON.stringify({
        events: [
          { tStartMs: 0, segs: [{ utf8: 'Hello&nbsp;' }, { utf8: 'world' }] },
          { tStartMs: 2000, dDurationMs: 500, segs: [{ utf8: 'Next' }] },
        ],
      }),
    );
    const cues = new CaptionNormalizer(
      { decode: (value) => value.replaceAll('&nbsp;', '\u00a0') },
      {
        limits: DEFAULT_CAPTION_LIMITS,
        defaultDurationMs: 1000,
        minimumDurationMs: 250,
      },
    ).normalize(raw);
    expect(cues[0]).toMatchObject({ startMs: 0, endMs: 2000, text: 'Hello world' });
    expect(cues[1]).toMatchObject({ startMs: 2000, endMs: 2500 });
  });

  it('parses WebVTT timestamps and multiline cues', () => {
    const cues = new WebVttCaptionParser().parse(
      'WEBVTT\n\n00:01.000 --> 00:03.500 align:center\nHello\nworld',
    );
    expect(cues).toEqual([
      { startMs: 1000, endMs: 3500, text: 'Hello\nworld' },
    ]);
  });

  it('reports excessive overlaps as invalid', () => {
    const report = new CaptionValidator(DEFAULT_CAPTION_LIMITS).validate([
      { id: 'a', startMs: 0, endMs: 10000, text: 'a' },
      { id: 'b', startMs: 100, endMs: 200, text: 'b' },
    ]);
    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.code === 'OVERLAPPING_CUES')).toBe(true);
  });
});
