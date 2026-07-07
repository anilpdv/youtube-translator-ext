import { describe, it, expect, vi } from 'vitest';
import {
  parseTimestampToSeconds,
  deduplicateRepeatedPhrases,
  collapseRepeatedText,
  collapseRollingCaption,
  normalizeForComparison,
  splitIntoBiteSizedSegments,
  isCJKText,
  chunkText,
  getLanguageCode,
  decodeHTMLEntities,
  detectTimedTextFormat,
  createTimedTextUrl,
  validateSubtitleTrack,
  parseTimedTextBody,
  parseTranscriptSegment,
  findTranscriptPanel,
  findScrollableTranscriptContainer,
  collectVirtualizedTranscript,
  formatSecondsToSRTTime,
  exportToSRT,
  exportToJSON,
  createCueId,
  isSoundLabel,
  translateSoundLabel,
  estimateReadingDuration,
  calculateCueDuration,
  mergeAdjacentDuplicateCues,
  mergeTranslations,
  validateExportTracks,
  wrapSubtitleText,
  isTimedTextBlocked,
  recordTimedTextRateLimit,
  canExportFullTrack,
} from '../../utils/transcript';

import type { TranscriptSegment, TranslatedSegment } from '../../utils/types';

// ─── parseTimestampToSeconds ──────────────────────────────────────────────────
describe('parseTimestampToSeconds', () => {
  it('parses MM:SS', () => {
    expect(parseTimestampToSeconds('1:30')).toBe(90);
  });

  it('parses HH:MM:SS', () => {
    expect(parseTimestampToSeconds('1:02:03')).toBe(3723);
  });

  it('returns 0 for empty string', () => {
    expect(parseTimestampToSeconds('')).toBe(0);
  });

  it('parses leading number fallback', () => {
    expect(parseTimestampToSeconds('45 seconds')).toBe(45);
  });

  it('parses 0:00', () => {
    expect(parseTimestampToSeconds('0:00')).toBe(0);
  });

  it('parses large minute values', () => {
    expect(parseTimestampToSeconds('14:46')).toBe(886);
  });
});

// ─── collapseRepeatedText & deduplicateRepeatedPhrases ────────────────────────
describe('collapseRepeatedText & deduplicateRepeatedPhrases', () => {
  it('returns empty string for empty input', () => {
    expect(collapseRepeatedText('')).toBe('');
  });

  it('removes exact duplicated halves', () => {
    const result = collapseRepeatedText('Hello world Hello world');
    expect(result).toBe('Hello world');
  });

  it('collapses 3x repeated CJK rolling caption phrases', () => {
    const repeated = '生の頃に立てられた 生の頃に立てられた 生の頃に立てられた';
    expect(collapseRepeatedText(repeated)).toBe('生の頃に立てられた');
  });

  it('removes consecutive duplicate words', () => {
    const result = collapseRepeatedText('the the cat sat sat');
    expect(result.split(' ')).not.toContain('the the');
  });

  it('strips music/applause annotations', () => {
    const result = collapseRepeatedText('[music] Hello there [music]');
    expect(result).not.toContain('[music]');
    expect(result).toContain('Hello there');
  });

  it('leaves normal text unchanged', () => {
    const text = 'This is a normal sentence.';
    expect(collapseRepeatedText(text)).toBe(text);
  });

  it('handles single word', () => {
    expect(collapseRepeatedText('Hello')).toBe('Hello');
  });
});

// ─── createTimedTextUrl & detectTimedTextFormat ───────────────────────────────
describe('createTimedTextUrl & detectTimedTextFormat', () => {
  it('properly configures fmt and tlang parameters using URL API', () => {
    const base = 'https://www.youtube.com/api/timedtext?v=test1234&lang=ja&fmt=srv3';
    const jsonUrl = createTimedTextUrl(base, 'json3', 'en');
    expect(jsonUrl).toContain('fmt=json3');
    expect(jsonUrl).toContain('tlang=en');
    expect(jsonUrl).toContain('v=test1234');

    const origUrl = createTimedTextUrl(jsonUrl, 'srv3');
    expect(origUrl).toContain('fmt=srv3');
    expect(origUrl).not.toContain('tlang=');
  });

  it('detects json3, srv3, xml, and vtt formats accurately', () => {
    expect(detectTimedTextFormat('{"events": []}')).toBe('json3');
    expect(detectTimedTextFormat('<timedtext format="3"><body><p t="1000"></p></body></timedtext>')).toBe('srv3');
    expect(detectTimedTextFormat('WEBVTT\n00:00.000 --> 00:04.000\nHello')).toBe('vtt');
    expect(detectTimedTextFormat('<transcript><text start="1" dur="2">Hello</text></transcript>')).toBe('xml');
    expect(detectTimedTextFormat('random non-subtitle text')).toBe('unknown');
  });
});

// ─── validateSubtitleTrack ───────────────────────────────────────────────────
describe('validateSubtitleTrack', () => {
  it('classifies empty track as invalid', () => {
    const result = validateSubtitleTrack([], 100);
    expect(result.valid).toBe(false);
    expect(result.completeness).toBe('invalid');
  });

  it('classifies 1 cue on long video as live', () => {
    const singleCue: TranscriptSegment[] = [{ start: 0, dur: 3.5, text: 'Hello' }];
    const result = validateSubtitleTrack(singleCue, 120);
    expect(result.valid).toBe(true);
    expect(result.completeness).toBe('live');
  });

  it('classifies multi-cue track covering video duration as full', () => {
    const fullTrack: TranscriptSegment[] = [
      { start: 0, dur: 4.0, text: 'Start' },
      { start: 40, dur: 4.0, text: 'Middle' },
      { start: 85, dur: 5.0, text: 'End' },
    ];
    const result = validateSubtitleTrack(fullTrack, 100);
    expect(result.valid).toBe(true);
    expect(result.completeness).toBe('full');
    expect(result.coveredDuration).toBe(90);
  });
});

// ─── isCJKText & chunkText ──────────────────────────────────────────────────
describe('isCJKText & chunkText', () => {
  it('identifies CJK characters correctly', () => {
    expect(isCJKText('今日はちょっと真面目なお話なんですけど')).toBe(true);
    expect(isCJKText('Hello world')).toBe(false);
    expect(isCJKText('Bonjour le monde')).toBe(false);
  });

  it('splits long Japanese sentences by punctuation and character boundaries', () => {
    const jaText = '今日はちょっと真面目なお話なんですけど、最後まで面白いお話も入ってるので楽しんでいってください。';
    const chunks = chunkText(jaText);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(25);
    });
  });

  it('splits multi-sentence English text into bite-sized chunks cleanly', () => {
    const enText = 'I was raised by my dad. My mom passed away from cancer when I was one year old.';
    const chunks = chunkText(enText);
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toBe('I was raised by my dad.');
    expect(chunks[1]).toBe('My mom passed away from cancer when');
    expect(chunks[2]).toBe('I was one year old.');
  });
});

// ─── splitIntoBiteSizedSegments ───────────────────────────────────────────────
describe('splitIntoBiteSizedSegments', () => {
  it('returns empty array for empty input', () => {
    expect(splitIntoBiteSizedSegments([])).toEqual([]);
  });

  it('keeps short segments intact', () => {
    const segments: TranscriptSegment[] = [
      { start: 0, dur: 3, text: 'Hello world' },
    ];
    const result = splitIntoBiteSizedSegments(segments);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world');
  });

  it('splits long segments into ≤7 word chunks', () => {
    const longText = 'one two three four five six seven eight nine ten';
    const segments: TranscriptSegment[] = [
      { start: 0, dur: 8, text: longText },
    ];
    const result = splitIntoBiteSizedSegments(segments);
    result.forEach((seg) => {
      const wordCount = seg.text.split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeLessThanOrEqual(9);
    });
  });

  it('splits Japanese long segment with multi-second duration into bite-sized timed cues', () => {
    const jaSeg: TranscriptSegment[] = [
      {
        start: 14,
        dur: 17,
        text: '今日はちょっと真面目なお話なんですけど、最後まで面白いお話も入ってるので楽しんでいってください。',
      },
    ];
    const result = splitIntoBiteSizedSegments(jaSeg);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].start).toBe(14);
    expect(result[1].start).toBeGreaterThan(14);
    result.forEach((s) => {
      expect(s.dur).toBeGreaterThanOrEqual(1.5);
      expect(s.text.length).toBeLessThanOrEqual(35);
    });
  });

  it('preserves total duration approximately', () => {
    const segments: TranscriptSegment[] = [
      { start: 0, dur: 10, text: 'one two three four five six seven eight nine ten' },
    ];
    const result = splitIntoBiteSizedSegments(segments);
    const totalDur = result.reduce((sum, s) => sum + s.dur, 0);
    expect(totalDur).toBeCloseTo(10, 0);
  });

  it('skips empty text segments', () => {
    const segments: TranscriptSegment[] = [
      { start: 0, dur: 3, text: '' },
      { start: 3, dur: 3, text: 'valid text' },
    ];
    const result = splitIntoBiteSizedSegments(segments);
    expect(result.every((s) => s.text.trim().length > 0)).toBe(true);
  });

  it('assigns sequential start times', () => {
    const longText = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';
    const segments: TranscriptSegment[] = [{ start: 5, dur: 10, text: longText }];
    const result = splitIntoBiteSizedSegments(segments);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
    }
  });
});

// ─── getLanguageCode ────────────────────────────────────────────────────────
describe('getLanguageCode', () => {
  it('maps language names to codes correctly', () => {
    expect(getLanguageCode('English')).toBe('en');
    expect(getLanguageCode('Japanese')).toBe('ja');
    expect(getLanguageCode('Spanish')).toBe('es');
    expect(getLanguageCode('French')).toBe('fr');
    expect(getLanguageCode('German')).toBe('de');
    expect(getLanguageCode('Chinese (Simplified)')).toBe('zh-Hans');
  });

  it('passes 2-letter codes through directly', () => {
    expect(getLanguageCode('ja')).toBe('ja');
    expect(getLanguageCode('es')).toBe('es');
    expect(getLanguageCode('')).toBe('en');
  });
});

// ─── decodeHTMLEntities ───────────────────────────────────────────────────────
describe('decodeHTMLEntities', () => {
  it('decodes standard HTML entities', () => {
    expect(decodeHTMLEntities('Fish &amp; Chips')).toBe('Fish & Chips');
    expect(decodeHTMLEntities('Tom &#39;n&#39; Jerry')).toBe("Tom 'n' Jerry");
    expect(decodeHTMLEntities('&quot;Hello&quot;')).toBe('"Hello"');
    expect(decodeHTMLEntities('5 &lt; 10 &gt; 2')).toBe('5 < 10 > 2');
    expect(decodeHTMLEntities('Hello&nbsp;World')).toBe('Hello World');
  });

  it('decodes numeric and hex entities', () => {
    expect(decodeHTMLEntities('&#65;&#66;&#67;')).toBe('ABC');
    expect(decodeHTMLEntities('&#x41;&#x42;&#x43;')).toBe('ABC');
  });

  it('handles empty or normal strings', () => {
    expect(decodeHTMLEntities('')).toBe('');
    expect(decodeHTMLEntities('Normal text')).toBe('Normal text');
  });
});

// ─── parseTimedTextBody ───────────────────────────────────────────────────────
describe('parseTimedTextBody', () => {
  it('parses JSON3 timedtext with ms precision', () => {
    const json3 = JSON.stringify({
      events: [
        { tStartMs: 140, dDurationMs: 4200, segs: [{ utf8: 'Hello world' }] },
        { tStartMs: 4340, dDurationMs: 3100, segs: [{ utf8: 'Second &amp; subtitle' }] },
      ],
    });
    const parsed = parseTimedTextBody(json3);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].start).toBe(0.14);
    expect(parsed[0].dur).toBe(4.2);
    expect(parsed[0].text).toBe('Hello world');
    expect(parsed[1].text).toBe('Second & subtitle');
  });

  it('parses YouTube SRV3 format XML (<p t="..." d="...">)', () => {
    const srv3Xml = `<?xml version="1.0" encoding="utf-8" ?>
<timedtext format="3">
  <head></head>
  <body>
    <p t="1400" d="4200"><s>こんにちは</s> <s>世界</s></p>
    <p t="5600" d="3500" w="1">私のお父さん&#39;s story</p>
  </body>
</timedtext>`;
    const parsed = parseTimedTextBody(srv3Xml);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].start).toBe(1.4);
    expect(parsed[0].dur).toBe(4.2);
    expect(parsed[0].text).toBe('こんにちは 世界');
    expect(parsed[1].start).toBe(5.6);
    expect(parsed[1].dur).toBe(3.5);
    expect(parsed[1].text).toBe("私のお父さん's story");
  });

  it('parses YouTube Standard format 1 XML (<text start="..." dur="...">)', () => {
    const xml = `<transcript>
      <text start="0.5" dur="2.5">Hello &amp; welcome</text>
      <text start="3.0" dur="4.0">To YouTube AI &#39;Translator&#39;</text>
    </transcript>`;
    const parsed = parseTimedTextBody(xml);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].start).toBe(0.5);
    expect(parsed[0].dur).toBe(2.5);
    expect(parsed[0].text).toBe('Hello & welcome');
    expect(parsed[1].start).toBe(3.0);
    expect(parsed[1].dur).toBe(4.0);
    expect(parsed[1].text).toBe("To YouTube AI 'Translator'");
  });

  it('parses WebVTT format', () => {
    const vtt = `WEBVTT

00:00:01.500 --> 00:00:04.200
First WebVTT cue

00:00:04.500 --> 00:00:08.000
Second <i>formatted</i> cue`;
    const parsed = parseTimedTextBody(vtt);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].start).toBe(1.5);
    expect(parsed[0].dur).toBe(2.7);
    expect(parsed[0].text).toBe('First WebVTT cue');
    expect(parsed[1].start).toBe(4.5);
    expect(parsed[1].dur).toBe(3.5);
    expect(parsed[1].text).toBe('Second formatted cue');
  });

  it('returns empty array on empty body', () => {
    expect(parseTimedTextBody('')).toEqual([]);
  });
});

// ─── formatSecondsToSRTTime ───────────────────────────────────────────────────
describe('formatSecondsToSRTTime', () => {
  it('formats zero correctly', () => {
    expect(formatSecondsToSRTTime(0)).toBe('00:00:00,000');
  });

  it('formats seconds and milliseconds', () => {
    expect(formatSecondsToSRTTime(14.25)).toBe('00:00:14,250');
  });

  it('formats minutes and hours', () => {
    expect(formatSecondsToSRTTime(3723.5)).toBe('01:02:03,500');
  });
});

// ─── exportToSRT ─────────────────────────────────────────────────────────────
describe('exportToSRT', () => {
  const sampleSegments: TranslatedSegment[] = [
    { start: 0, dur: 3.5, text: 'こんにちは', translatedText: 'Hello' },
    { start: 3.5, dur: 4.0, text: '世界', translatedText: 'World' },
  ];

  it('exports translated subtitles correctly', () => {
    const srt = exportToSRT(sampleSegments, 'translated');
    expect(srt).toContain('1\n00:00:00,000 --> 00:00:03,500\nHello');
    expect(srt).toContain('2\n00:00:03,500 --> 00:00:07,500\nWorld');
  });

  it('exports original subtitles correctly', () => {
    const srt = exportToSRT(sampleSegments, 'original');
    expect(srt).toContain('こんにちは');
    expect(srt).toContain('世界');
  });

  it('exports bilingual subtitles correctly', () => {
    const srt = exportToSRT(sampleSegments, 'bilingual');
    expect(srt).toContain('こんにちは\nHello');
    expect(srt).toContain('世界\nWorld');
  });

  it('returns empty string for empty input', () => {
    expect(exportToSRT([])).toBe('');
  });
});

// ─── exportToJSON ─────────────────────────────────────────────────────────────
describe('exportToJSON', () => {
  const sampleSegments: TranslatedSegment[] = [
    { start: 1.2, dur: 3.0, text: 'Orig', translatedText: 'Trans' },
  ];

  it('exports full metadata and cues in JSON format', () => {
    const jsonStr = exportToJSON(sampleSegments, { videoId: 'test1234' });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.totalCues).toBe(1);
    expect(parsed.metadata.videoId).toBe('test1234');
    expect(parsed.subtitles[0].originalText).toBe('Orig');
    expect(parsed.subtitles[0].translatedText).toBe('Trans');
    expect(parsed.subtitles[0].startSeconds).toBe(1.2);
    expect(parsed.subtitles[0].endSeconds).toBe(4.2);
  });
});

// ─── DOM Transcript Parsing & Virtualized Collection ──────────────────────────
describe('DOM Transcript Parsing & Virtualized Collection', () => {
  it('parses modern transcript-segment-view-model structure correctly without text duplication', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <transcript-segment-view-model class="ytwTranscriptSegmentViewModelHost">
        <div class="ytwTranscriptSegmentViewModelTimestamp">0:14</div>
        <div class="ytAttributedStringHost">
          <span role="text">私のお父さんの話</span>
        </div>
      </transcript-segment-view-model>
    `;
    const segmentEl = container.querySelector('transcript-segment-view-model') as HTMLElement;
    const result = parseTranscriptSegment(segmentEl);

    expect(result).not.toBeNull();
    expect(result?.start).toBe(14);
    expect(result?.text).toBe('私のお父さんの話');
  });

  it('parses legacy ytd-transcript-segment-renderer correctly', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <ytd-transcript-segment-renderer>
        <div class="segment-timestamp">1:30</div>
        <yt-formatted-string class="segment-text">Hello from legacy transcript</yt-formatted-string>
      </ytd-transcript-segment-renderer>
    `;
    const segmentEl = container.querySelector('ytd-transcript-segment-renderer') as HTMLElement;
    const result = parseTranscriptSegment(segmentEl);

    expect(result).not.toBeNull();
    expect(result?.start).toBe(90);
    expect(result?.text).toBe('Hello from legacy transcript');
  });

  it('collapses rolling Japanese caption repetitions during segment parsing', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <transcript-segment-view-model>
        <div class="ytwTranscriptSegmentViewModelTimestamp">0:58</div>
        <div class="ytAttributedStringHost">
          <span role="text">生の頃に立てられた 生の頃に立てられた 生の頃に立てられた</span>
        </div>
      </transcript-segment-view-model>
    `;
    const segmentEl = container.querySelector('transcript-segment-view-model') as HTMLElement;
    const result = parseTranscriptSegment(segmentEl);

    expect(result).not.toBeNull();
    expect(result?.start).toBe(58);
    expect(result?.text).toBe('生の頃に立てられた');
  });

  it('finds visible transcript panel in DOM', () => {
    document.body.innerHTML = `
      <div id="panels">
        <ytd-engagement-panel-section-list-renderer target-id="engagement-panel-searchable-transcript" style="display: block;">
          <div id="content" style="height: 500px; overflow-y: auto;">
            <transcript-segment-view-model>
              <div class="ytwTranscriptSegmentViewModelTimestamp">0:01</div>
              <div class="ytAttributedStringHost">Hello</div>
            </transcript-segment-view-model>
          </div>
        </ytd-engagement-panel-section-list-renderer>
      </div>
    `;
    // Mock getBoundingClientRect
    const panel = document.querySelector('ytd-engagement-panel-section-list-renderer') as HTMLElement;
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      height: 500,
      width: 300,
      top: 0,
      left: 0,
      bottom: 500,
      right: 300,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const found = findTranscriptPanel();
    expect(found).not.toBeNull();
    expect(found?.getAttribute('target-id')).toBe('engagement-panel-searchable-transcript');
  });

  it('collects all segments across simulated virtualized scrolling and reconstructs durations', async () => {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div id="content" style="height: 200px; overflow-y: scroll;">
        <div id="segment-container"></div>
      </div>
    `;
    const content = panel.querySelector('#content') as HTMLElement;
    const segContainer = panel.querySelector('#segment-container') as HTMLElement;

    Object.defineProperty(content, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(content, 'scrollHeight', { value: 600, configurable: true });
    let currentScrollTop = 0;
    Object.defineProperty(content, 'scrollTop', {
      get: () => currentScrollTop,
      set: (val: number) => {
        currentScrollTop = val;
        // Simulate virtualization by loading different DOM nodes depending on scrollTop
        if (currentScrollTop < 200) {
          segContainer.innerHTML = `
            <transcript-segment-view-model>
              <div class="ytwTranscriptSegmentViewModelTimestamp">0:00</div>
              <div class="ytAttributedStringHost">First sentence</div>
            </transcript-segment-view-model>
            <transcript-segment-view-model>
              <div class="ytwTranscriptSegmentViewModelTimestamp">0:05</div>
              <div class="ytAttributedStringHost">Second sentence</div>
            </transcript-segment-view-model>
          `;
        } else if (currentScrollTop < 400) {
          segContainer.innerHTML = `
            <transcript-segment-view-model>
              <div class="ytwTranscriptSegmentViewModelTimestamp">0:10</div>
              <div class="ytAttributedStringHost">Third sentence</div>
            </transcript-segment-view-model>
          `;
        } else {
          segContainer.innerHTML = `
            <transcript-segment-view-model>
              <div class="ytwTranscriptSegmentViewModelTimestamp">0:20</div>
              <div class="ytAttributedStringHost">Final sentence</div>
            </transcript-segment-view-model>
          `;
        }
      },
      configurable: true,
    });

    // Trigger initial population
    content.scrollTop = 0;

    const segments = await collectVirtualizedTranscript(panel);

    expect(segments.length).toBe(4);
    expect(segments[0].start).toBe(0);
    expect(segments[0].dur).toBeGreaterThan(1.0);
    expect(segments[0].dur).toBeLessThanOrEqual(5.0);
    expect(segments[0].text).toBe('First sentence');

    expect(segments[1].start).toBe(5);
    expect(segments[1].dur).toBeGreaterThan(1.0);
    expect(segments[1].dur).toBeLessThanOrEqual(5.0);

    expect(segments[2].start).toBe(10);
    expect(segments[2].dur).toBeGreaterThan(1.0);
    expect(segments[2].dur).toBeLessThanOrEqual(5.0); // Clamped adaptively to prevent 10s lingering!

    expect(segments[3].start).toBe(20);
    expect(segments[3].dur).toBeGreaterThan(1.0);
    expect(segments[3].text).toBe('Final sentence');
  });
});

// ─── createCueId ─────────────────────────────────────────────────────────────
describe('createCueId', () => {
  it('generates consistent deterministic cue ID', () => {
    const id1 = createCueId('v123', 12.5, 3);
    const id2 = createCueId('v123', 12.5, 3);
    expect(id1).toBe(id2);
    expect(id1).toBe('v123:12.500:3');
  });
});

// ─── isSoundLabel & translateSoundLabel ───────────────────────────────────────
describe('isSoundLabel & translateSoundLabel', () => {
  it('identifies bracketed sound effects', () => {
    expect(isSoundLabel('[ため息]')).toBe(true);
    expect(isSoundLabel('（拍手）')).toBe(true);
    expect(isSoundLabel('[Music]')).toBe(true);
    expect(isSoundLabel('(Applause)')).toBe(true);
    expect(isSoundLabel('This is [normal] dialogue')).toBe(false);
  });

  it('translates Japanese sound effects to English equivalents', () => {
    expect(translateSoundLabel('[ため息]')).toBe('[Sighing]');
    expect(translateSoundLabel('（拍手）')).toBe('(Applause)');
    expect(translateSoundLabel('[笑い声]')).toBe('[Laughter]');
    expect(translateSoundLabel('[泣き声]')).toBe('[Crying]');
    expect(translateSoundLabel('[沈黙]')).toBe('[Silence]');
  });
});

// ─── estimateReadingDuration & calculateCueDuration ──────────────────────────
describe('estimateReadingDuration & calculateCueDuration', () => {
  it('calculates short sentence reading duration accurately', () => {
    const dur = estimateReadingDuration('Short sentence', false);
    expect(dur).toBeGreaterThanOrEqual(1.2);
    expect(dur).toBeLessThanOrEqual(3.0);
  });

  it('preserves intentional silent gaps between distant cues', () => {
    const cue1: TranscriptSegment = { start: 13.0, dur: 0, text: 'Short sentence' };
    const cue2: TranscriptSegment = { start: 57.0, dur: 0, text: 'Next line after silence' };

    const calculatedDur = calculateCueDuration(cue1, cue2, cue1.text);
    // Silent gap from 13.0 to 57.0 should NOT cause cue1 to last 44s
    expect(calculatedDur).toBeLessThan(5.0);
    expect(calculatedDur).toBeGreaterThanOrEqual(1.2);
  });

  it('allows natural duration when next cue is adjacent', () => {
    const cue1: TranscriptSegment = { start: 10.0, dur: 0, text: 'Normal length spoken sentence' };
    const cue2: TranscriptSegment = { start: 13.0, dur: 0, text: 'Following sentence' };

    const calculatedDur = calculateCueDuration(cue1, cue2, cue1.text);
    expect(calculatedDur).toBeGreaterThanOrEqual(1.2);
    expect(calculatedDur).toBeLessThanOrEqual(3.0);
  });
});

// ─── mergeAdjacentDuplicateCues ──────────────────────────────────────────────
describe('mergeAdjacentDuplicateCues', () => {
  it('merges adjacent identical cues within threshold gap', () => {
    const cues: TranscriptSegment[] = [
      { id: '1', start: 10.0, dur: 2.0, text: 'Repeated words' },
      { id: '2', start: 10.5, dur: 2.0, text: 'Repeated words' },
      { id: '3', start: 20.0, dur: 2.0, text: 'Other dialogue' },
    ];

    const { cues: merged, report } = mergeAdjacentDuplicateCues(cues, 1.0);
    expect(merged).toHaveLength(2);
    expect(merged[0].text).toBe('Repeated words');
    expect(merged[0].dur).toBe(2.5); // extended duration
    expect(report.mergedCount).toBe(1);
  });

  it('does NOT merge identical cues separated by a large gap', () => {
    const cues: TranscriptSegment[] = [
      { id: '1', start: 10.0, dur: 2.0, text: 'Hello' },
      { id: '2', start: 50.0, dur: 2.0, text: 'Hello' },
    ];

    const { cues: merged, report } = mergeAdjacentDuplicateCues(cues, 1.0);
    expect(merged).toHaveLength(2);
    expect(report.mergedCount).toBe(0);
  });
});

// ─── mergeTranslations (Strict Left Join & 100% Retention) ────────────────────
describe('mergeTranslations', () => {
  it('preserves 100% of source cues and matching IDs even when translation response is partial', () => {
    const source: TranscriptSegment[] = Array.from({ length: 45 }, (_, i) => ({
      id: `cue_${i}`,
      start: i * 2,
      dur: 2,
      text: `Source sentence ${i}`,
    }));

    // AI model returns only first 40 cues and drops 5 cues
    const partialTranslations = source.slice(0, 40).map((s) => ({
      id: s.id,
      translated: `Translated sentence ${s.id}`,
    }));

    const merged = mergeTranslations(source, partialTranslations);

    expect(merged).toHaveLength(45);
    for (let i = 0; i < 45; i++) {
      expect(merged[i].id).toBe(source[i].id);
      expect(merged[i].start).toBe(source[i].start);
      if (i < 40) {
        expect(merged[i].translationStatus).toBe('translated');
        expect(merged[i].translatedText).toBe(`Translated sentence cue_${i}`);
      } else {
        // Retained safely with original text
        expect(merged[i].translationStatus).toBe('failed');
        expect(merged[i].translatedText).toBe(`Source sentence ${i}`);
      }
    }
  });
});

// ─── validateExportTracks ────────────────────────────────────────────────────
describe('validateExportTracks', () => {
  it('validates equal track lengths and matching cue IDs without throwing', () => {
    const source: TranscriptSegment[] = [
      { id: 'c1', start: 0, dur: 2, text: 'Hello' },
      { id: 'c2', start: 2, dur: 2, text: 'World' },
    ];
    const translated: TranslatedSegment[] = [
      { id: 'c1', start: 0, dur: 2, text: 'Hello', translatedText: 'Bonjour' },
      { id: 'c2', start: 2, dur: 2, text: 'World', translatedText: 'Monde' },
    ];

    expect(() => validateExportTracks(source, translated)).not.toThrow();
  });

  it('throws error when track lengths or cue IDs mismatch', () => {
    const source: TranscriptSegment[] = [
      { id: 'c1', start: 0, dur: 2, text: 'Hello' },
    ];
    const translated: TranslatedSegment[] = [
      { id: 'c2', start: 0, dur: 2, text: 'Hello', translatedText: 'Bonjour' },
    ];

    expect(() => validateExportTracks(source, translated)).toThrow(/Cue identity mismatch/);
  });
});

// ─── TimedTextCircuit ────────────────────────────────────────────────────────
describe('TimedTextCircuit', () => {
  it('records 429 rate limit and blocks video for cooldown period', () => {
    expect(isTimedTextBlocked('video-test-1')).toBe(false);
    recordTimedTextRateLimit('video-test-1');
    expect(isTimedTextBlocked('video-test-1')).toBe(true);
  });
});

// ─── wrapSubtitleText ────────────────────────────────────────────────────────
describe('wrapSubtitleText', () => {
  it('wraps long English subtitles cleanly into max 2 lines', () => {
    const text = 'This is a somewhat long subtitle text that should be split gracefully across two separate lines without cutting words in half.';
    const lines = wrapSubtitleText(text, 2, 42);
    expect(lines.length).toBeLessThanOrEqual(2);
    lines.forEach((line) => {
      expect(line.length).toBeLessThanOrEqual(55);
    });
  });

  it('wraps Japanese subtitle text by punctuation without breaking words', () => {
    const jaText = '今日はちょっと真面目なお話なんですけど、最後に面白いお話もするので楽しんでいただけたらと思います。';
    const lines = wrapSubtitleText(jaText, 2, 42, 20);
    expect(lines.length).toBeLessThanOrEqual(2);
  });
});

// ─── 00:01:57 Regression Fixture Test ────────────────────────────────────────
describe('00:01:57 Regression Fixture', () => {
  it('ensures cue at 00:01:57 is parsed and translated without 11-second lag or dropping', () => {
    const rawCues: TranscriptSegment[] = [
      { id: 'cue_110', start: 110.0, dur: 2.5, text: 'ちょっと悲しいことがありました' },
      { id: 'cue_117', start: 117.0, dur: 0, text: 'すごく可哀想と言われすぎて…　 正直あんまり自分では感じていなくて' },
      { id: 'cue_125', start: 125.0, dur: 0, text: '実は次女の姉がダウン症でして' },
    ];

    // Compute duration
    rawCues[1].dur = calculateCueDuration(rawCues[1], rawCues[2], rawCues[1].text);
    expect(rawCues[1].dur).toBeLessThanOrEqual(8.0); // Not 11s or stretched
    expect(rawCues[1].dur).toBeGreaterThanOrEqual(1.8);

    const translations = [
      { id: 'cue_110', translated: 'Something a bit sad happened' },
      { id: 'cue_117', translated: 'People called me "poor thing" way too often... I honestly never felt that way' },
      { id: 'cue_125', translated: 'Actually, my second older sister has Down syndrome' },
    ];

    const merged = mergeTranslations(rawCues, translations);
    expect(merged[1].id).toBe('cue_117');
    expect(merged[1].start).toBe(117.0);
    expect(merged[1].translatedText).toContain('People called me');
    expect(merged[1].translationStatus).toBe('translated');
  });
});

// ─── canExportFullTrack ──────────────────────────────────────────────────────
describe('canExportFullTrack', () => {
  it('returns true when phase is ready and cue counts are aligned and positive', () => {
    expect(canExportFullTrack('ready', 45, 45)).toBe(true);
    expect(canExportFullTrack('full', 10, 10)).toBe(true);
  });

  it('returns false if phase is not ready/full', () => {
    expect(canExportFullTrack('partial', 45, 45)).toBe(false);
    expect(canExportFullTrack('translating', 45, 45)).toBe(false);
    expect(canExportFullTrack('idle', 45, 45)).toBe(false);
    expect(canExportFullTrack('error', 45, 45)).toBe(false);
  });

  it('returns false if sourceCount is 0', () => {
    expect(canExportFullTrack('ready', 0, 0)).toBe(false);
  });

  it('returns false if sourceCount does not equal translatedCount', () => {
    expect(canExportFullTrack('ready', 45, 44)).toBe(false);
    expect(canExportFullTrack('ready', 44, 45)).toBe(false);
  });
});


