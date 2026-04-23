import {
  DEFAULT_TIMING,
  READING_SPEED_PRESETS,
  SubtitleTimingSettings,
  TranscriptSegment,
  TranslatedSegment,
} from './types';

/**
 * Creates a permanent, deterministic cue ID based on video ID, start time, and sequence index.
 */
export function createCueId(videoId: string, start: number, index: number): string {
  const safeId = videoId || 'cue';
  return `${safeId}:${start.toFixed(3)}:${index}`;
}

export const SOUND_LABEL_DICTIONARY: Record<string, string> = {
  '[ため息]': '[Sighing]',
  '[息遣い]': '[Breathing]',
  '[拍手]': '[Applause]',
  '[笑い]': '[Laughter]',
  '[笑い声]': '[Laughter]',
  '[泣き声]': '[Crying]',
  '[沈黙]': '[Silence]',
  '[音楽]': '[Music]',
  '[鼻息]': '[Snorting]',
  '（ため息）': '(Sighing)',
  '（息遣い）': '(Breathing)',
  '（拍手）': '(Applause)',
  '（笑い）': '(Laughter)',
  '（笑い声）': '(Laughter)',
  '（泣き声）': '(Crying)',
  '（沈黙）': '(Silence)',
  '（音楽）': '(Music)',
  '（鼻息）': '(Snorting)',
};

/**
 * Checks if a string is a bracketed sound annotation (e.g. [ため息], (Applause))
 */
export function isSoundLabel(text: string): boolean {
  return /^\s*[\[\（\(].+[\]\）\)]\s*$/.test(text);
}

/**
 * Translates standard sound labels deterministically via dictionary before LLM
 */
export function translateSoundLabel(text: string): string {
  const trimmed = text.trim();
  return SOUND_LABEL_DICTIONARY[trimmed] || trimmed;
}

export function resolveTimingSettings(
  settings?: Partial<SubtitleTimingSettings> | Partial<ExtensionSettings>
): SubtitleTimingSettings {
  if (!settings) return DEFAULT_TIMING;

  const ext = settings as Partial<ExtensionSettings>;
  const speedPreset = ext.subtitleReadingSpeed ? READING_SPEED_PRESETS[ext.subtitleReadingSpeed] : undefined;

  return {
    minDuration: ext.subtitleMinDuration ?? (settings as Partial<SubtitleTimingSettings>).minDuration ?? DEFAULT_TIMING.minDuration,
    maxDuration: ext.subtitleMaxDuration ?? (settings as Partial<SubtitleTimingSettings>).maxDuration ?? DEFAULT_TIMING.maxDuration,
    gapBeforeNextCue: (settings as Partial<SubtitleTimingSettings>).gapBeforeNextCue ?? DEFAULT_TIMING.gapBeforeNextCue,
    wordsPerSecond: speedPreset?.wordsPerSecond ?? (settings as Partial<SubtitleTimingSettings>).wordsPerSecond ?? DEFAULT_TIMING.wordsPerSecond,
    charsPerSecondCJK: speedPreset?.charsPerSecondCJK ?? (settings as Partial<SubtitleTimingSettings>).charsPerSecondCJK ?? DEFAULT_TIMING.charsPerSecondCJK,
    punctuationBonus: (settings as Partial<SubtitleTimingSettings>).punctuationBonus ?? DEFAULT_TIMING.punctuationBonus,
    syncOffset: ext.subtitleSyncOffsetMs !== undefined ? ext.subtitleSyncOffsetMs / 1000 : ((settings as Partial<SubtitleTimingSettings>).syncOffset ?? DEFAULT_TIMING.syncOffset),
    duplicateMergeGap: (settings as Partial<SubtitleTimingSettings>).duplicateMergeGap ?? 1.0,
  };
}

/**
 * Estimates reading duration in seconds for subtitle display based on character/word counts,
 * CJK vs. Western reading speed, and punctuation bonus.
 */
export function estimateReadingDuration(
  text: string,
  isCJK: boolean,
  settings: Partial<SubtitleTimingSettings> | Partial<ExtensionSettings> = DEFAULT_TIMING
): number {
  const timing = resolveTimingSettings(settings);
  const normalized = text.trim();
  if (!normalized) {
    return timing.minDuration;
  }

  const baseDuration = isCJK
    ? normalized.replace(/\s+/g, '').length / timing.charsPerSecondCJK
    : normalized.split(/\s+/).filter(Boolean).length / timing.wordsPerSecond;

  const punctuationCount = (normalized.match(/[.!?。！？,，、]/g) || []).length;

  return Math.min(
    timing.maxDuration,
    Math.max(
      timing.minDuration,
      baseDuration + Math.min(0.8, punctuationCount * timing.punctuationBonus)
    )
  );
}

/**
 * Calculates adaptive cue duration without stretching across long silent gaps.
 */
export function calculateCueDuration(
  cue: TranscriptSegment,
  next: TranscriptSegment | undefined,
  displayText: string,
  settings: Partial<SubtitleTimingSettings> | Partial<ExtensionSettings> = DEFAULT_TIMING
): number {
  const timing = resolveTimingSettings(settings);
  const readingDuration = estimateReadingDuration(displayText, isCJKText(displayText), timing);

  if (!next) {
    return readingDuration;
  }

  const availableDuration = next.start - cue.start - timing.gapBeforeNextCue;
  if (availableDuration <= 0) {
    return timing.minDuration;
  }

  return Math.min(readingDuration, availableDuration);
}

export interface NormalizationReport {
  inputCount: number;
  outputCount: number;
  mergedCount: number;
  mergedIds: string[][];
  removedIds: string[];
  reasonById: Record<string, string>;
}

/**
 * Merges adjacent identical speech-to-text / sound cues when the gap is below threshold.
 */
export function mergeAdjacentDuplicateCues(
  cues: TranscriptSegment[],
  duplicateMergeGap = 1.0
): { cues: TranscriptSegment[]; report: NormalizationReport } {
  const report: NormalizationReport = {
    inputCount: cues.length,
    outputCount: 0,
    mergedCount: 0,
    mergedIds: [],
    removedIds: [],
    reasonById: {},
  };

  if (!cues || cues.length === 0) {
    return { cues: [], report };
  }

  const result: TranscriptSegment[] = [];

  for (let i = 0; i < cues.length; i++) {
    const current = cues[i];
    const next = cues[i + 1];

    if (
      next &&
      normalizeForComparison(current.text) === normalizeForComparison(next.text) &&
      next.start - (current.start + current.dur) <= duplicateMergeGap
    ) {
      const currentId = current.id || String(i);
      const nextId = next.id || String(i + 1);
      const mergedCue: TranscriptSegment = {
        id: current.id,
        start: current.start,
        dur: Math.max(current.dur, next.start + next.dur - current.start),
        text: current.text,
        source: current.source,
      };
      result.push(mergedCue);
      report.mergedIds.push([currentId, nextId]);
      report.reasonById[nextId] = `Merged with duplicate previous cue ${currentId}`;
      i++; // Skip merged next cue
    } else {
      result.push({ ...current });
    }
  }

  report.mergedCount = report.mergedIds.length;
  report.outputCount = result.length;
  return { cues: result, report };
}

/**
 * Merges translated responses into source track using a strict left join by ID.
 * Guarantees that translatedTrack.length === sourceTrack.length and translatedTrack[i].id === sourceTrack[i].id.
 */
export function mergeTranslations(
  source: TranscriptSegment[],
  translations: Array<{ id?: string; translated: string }>
): TranslatedSegment[] {
  const translationMap = new Map<string, string>();
  for (const item of translations) {
    if (item && item.id !== undefined && item.id !== 'undefined') {
      translationMap.set(String(item.id), item.translated?.trim() ?? '');
    }
  }

  return source.map((cue, index) => {
    const cueId = cue.id || String(index);
    const translated =
      translationMap.get(cueId) ??
      (cue.id ? translationMap.get(cue.id) : undefined) ??
      translationMap.get(String(index));

    const isTranslated = Boolean(translated && translated.length > 0);

    return {
      ...cue,
      id: cueId,
      translatedText: isTranslated ? translated! : cue.text,
      translationStatus: isTranslated ? 'translated' : 'failed',
    };
  });
}

/**
 * Validates track integrity across source, translated, and bilingual tracks.
 */
export function validateExportTracks(
  original: TranscriptSegment[],
  translated: TranslatedSegment[]
): void {
  if (!original || !translated) {
    throw new Error('Missing original or translated track for export validation');
  }
  if (original.length !== translated.length) {
    throw new Error(`Track mismatch: original=${original.length}, translated=${translated.length}`);
  }

  for (let index = 0; index < original.length; index++) {
    if (original[index].id !== translated[index].id) {
      throw new Error(
        `Cue identity mismatch at index ${index}: original ID=${original[index].id} vs translated ID=${translated[index].id}`
      );
    }
  }

  const missingCount = translated.filter(
    (t) => t.translationStatus === 'failed' || t.translatedText === t.text
  ).length;

  console.info(
    `[AI Subtitles] Track integrity: source=${original.length} translated=${translated.length} bilingual=${original.length} missingTranslations=${missingCount}`
  );
}

/**
 * Structured diagnostic logger for track stages
 */
export function logTrackStage(stage: string, track: TranscriptSegment[]): void {
  console.info('[AI Subtitles] Track stage', {
    stage,
    count: track.length,
    ids: track.map((cue) => cue.id),
    starts: track.map((cue) => cue.start),
  });
}

export interface TimedTextCircuit {
  videoId: string;
  blockedUntil: number;
  reason: 'rate-limited' | 'empty-response';
}

const timedTextCircuits = new Map<string, TimedTextCircuit>();

export function isTimedTextBlocked(videoId: string): boolean {
  const circuit = timedTextCircuits.get(videoId);
  if (!circuit) return false;
  if (Date.now() > circuit.blockedUntil) {
    timedTextCircuits.delete(videoId);
    return false;
  }
  return true;
}

export function recordTimedTextRateLimit(videoId: string): void {
  timedTextCircuits.set(videoId, {
    videoId,
    blockedUntil: Date.now() + 10 * 60 * 1000, // 10 minute cooldown
    reason: 'rate-limited',
  });
  console.warn(`[AI Subtitles] 🛑 Timedtext rate limit circuit tripped for video ${videoId}. Blocked for 10m.`);
}

/**
 * Wraps or splits subtitle text semantically into maxLines without breaking words
 */
export function wrapSubtitleText(
  text: string,
  maxLines = 2,
  maxCharsPerLine = 42,
  maxCJKCharsPerLine = 20
): string[] {
  if (!text) return [];
  const isCJK = isCJKText(text);
  const maxChars = isCJK ? maxCJKCharsPerLine : maxCharsPerLine;

  if (text.length <= maxChars) {
    return [text];
  }

  if (isCJK) {
    const parts = text.split(/(?<=[、。！？\s])/).map((p) => p.trim()).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const part of parts) {
      if ((current + part).length > maxChars && current.length > 0) {
        lines.push(current);
        current = part;
      } else {
        current += part;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, maxLines);
  }

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxChars && currentLine.length > 0) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines.slice(0, maxLines);
}

export const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  russian: 'ru',
  japanese: 'ja',
  chinese: 'zh-Hans',
  'chinese (simplified)': 'zh-Hans',
  'chinese (traditional)': 'zh-Hant',
  korean: 'ko',
  hindi: 'hi',
  arabic: 'ar',
  bengali: 'bn',
  punjabi: 'pa',
  marathi: 'mr',
  telugu: 'te',
  tamil: 'ta',
  turkish: 'tr',
  vietnamese: 'vi',
  indonesian: 'id',
  thai: 'th',
  dutch: 'nl',
  polish: 'pl',
  ukrainian: 'uk',
  greek: 'el',
  czech: 'cs',
  swedish: 'sv',
};

export function getLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const clean = lang.trim().toLowerCase();
  return LANGUAGE_NAME_TO_CODE[clean] || (clean.length === 2 ? clean : 'en');
}

/**
 * Decodes HTML entities commonly present in YouTube timedtext XML and JSON (e.g. &amp;, &#39;, &quot;)
 */
export function decodeHTMLEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Detects the timedtext response format from body text
 */
export function detectTimedTextFormat(body: string): 'json3' | 'srv3' | 'xml' | 'vtt' | 'unknown' {
  const trimmed = body.trim();
  if (trimmed.startsWith('{') || trimmed.includes('"events"')) return 'json3';
  if (trimmed.includes('format="3"') || /<p\s+t="/.test(trimmed)) return 'srv3';
  if (trimmed.startsWith('WEBVTT') || trimmed.includes('-->')) return 'vtt';
  if (/<text\s+start="/.test(trimmed) || trimmed.includes('<transcript>')) return 'xml';
  return 'unknown';
}

/**
 * Normalizes text for robust comparison by stripping whitespace and punctuation
 */
export function normalizeForComparison(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[。、，,.!?！？:：;；—–-]/g, '')
    .trim();
}

/**
 * Collapses repeating clauses and rolling CJK/Western captions
 */
export function collapseRollingCaption(value: string): string {
  const text = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const sentenceParts = text
    .split(/(?<=[。！？.!?])/)
    .map((part) => part.trim())
    .filter(Boolean);

  const uniqueParts: string[] = [];
  const seen = new Set<string>();

  for (const part of sentenceParts) {
    const key = normalizeForComparison(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueParts.push(part);
  }

  let result = uniqueParts.join(' ');
  const midpoint = Math.floor(result.length / 2);

  for (
    let split = Math.max(1, midpoint - 12);
    split <= Math.min(result.length - 1, midpoint + 12);
    split++
  ) {
    const left = result.slice(0, split).trim();
    const right = result.slice(split).trim();

    if (normalizeForComparison(left) === normalizeForComparison(right)) {
      result = left;
      break;
    }
  }

  return collapseRepeatedText(result);
}

/**
 * Collapses 2x, 3x, and Nx repeated word sequences and CJK sentences commonly generated by speech-to-text.
 */
export function collapseRepeatedText(text: string): string {
  if (!text) return '';
  let clean = deduplicateRepeatedPhrases(text);
  if (!clean) return '';

  // 1. Check repeated token units (e.g. "word A word B word A word B word A word B")
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length >= 4) {
    for (let unitSize = 1; unitSize <= Math.floor(tokens.length / 2); unitSize++) {
      if (tokens.length % unitSize !== 0 && tokens.length < unitSize * 2) continue;
      const unit = tokens.slice(0, unitSize);
      let isAllMatch = true;

      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].toLowerCase() !== unit[i % unitSize].toLowerCase()) {
          isAllMatch = false;
          break;
        }
      }

      if (isAllMatch && tokens.length >= unitSize * 2) {
        clean = unit.join(' ');
        break;
      }
    }
  }

  // 2. Check repeated CJK substring repetitions (e.g. "生の頃に立てられた 生の頃に立てられた 生の頃に立てられた")
  const cjkTokens = clean.split(/\s+/).filter(Boolean);
  if (cjkTokens.length >= 2) {
    const first = cjkTokens[0];
    if (cjkTokens.every((t) => t === first)) {
      return first;
    }
  }

  const len = clean.length;
  for (let unitLen = 2; unitLen <= Math.floor(len / 2); unitLen++) {
    if (len % unitLen !== 0) continue;
    const unit = clean.slice(0, unitLen);
    const count = len / unitLen;
    if (count >= 2 && unit.repeat(count) === clean) {
      return unit;
    }
  }

  return clean;
}

/**
 * Robustly removes duplicated words and repeated sentences safely without regex lookbehind.
 */
export function deduplicateRepeatedPhrases(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/\[(?:musique|music|applause|rires|laughter)\]/gi, '').trim();

  // Check if string consists of two identical halves
  const n = cleaned.length;
  const half = Math.floor(n / 2);
  for (let offset = -3; offset <= 3; offset++) {
    const h = half + offset;
    if (h > 5 && h < n - 5) {
      const first = cleaned.substring(0, h).trim();
      const second = cleaned.substring(h).trim();
      if (first.toLowerCase() === second.toLowerCase()) {
        return first;
      }
    }
  }

  // Split words safely
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    const halfLen = Math.floor(words.length / 2);
    const firstHalf = words.slice(0, halfLen).join(' ').toLowerCase();
    const secondHalf = words.slice(halfLen).join(' ').toLowerCase();
    if (firstHalf === secondHalf) {
      return words.slice(0, halfLen).join(' ');
    }
  }

  // Strip consecutive duplicate words
  const deduplicatedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && words[i].toLowerCase() === words[i - 1].toLowerCase()) {
      continue;
    }
    deduplicatedWords.push(words[i]);
  }

  return deduplicatedWords.join(' ');
}

/**
 * Checks if a string contains Chinese, Japanese, or Korean (CJK) characters.
 */
export function isCJKText(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(text);
}

/**
 * Chunks long sentences into bite-sized subtitle phrases.
 */
export function chunkText(text: string): string[] {
  if (!text) return [];
  if (isCJKText(text)) {
    const rawParts = text.split(/(?<=[、。！？])/).map((p) => p.trim()).filter(Boolean);
    const result: string[] = [];
    for (const part of rawParts) {
      if (part.length <= 25) {
        result.push(part);
      } else {
        for (let i = 0; i < part.length; i += 20) {
          result.push(part.slice(i, i + 20));
        }
      }
    }
    return result.length > 0 ? result : [text];
  }

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const result: string[] = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length <= 7) {
      result.push(trimmed);
    } else {
      for (let i = 0; i < words.length; i += 7) {
        const slice = words.slice(i, i + 7).join(' ');
        if (slice) result.push(slice);
      }
    }
  }
  return result.length > 0 ? result : [text];
}

/**
 * Splits oversized transcript cues into readable bite-sized subtitle cues with proportional timing.
 */
export function splitIntoBiteSizedSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  const result: TranscriptSegment[] = [];

  for (const seg of segments) {
    const text = seg.text.trim();
    if (!text) continue;

    const chunks = chunkText(text);
    if (chunks.length <= 1) {
      result.push({
        ...seg,
        text,
        dur: Math.max(1.2, seg.dur),
      });
      continue;
    }

    const totalDur = Math.max(1.5 * chunks.length, seg.dur);
    const chunkDur = totalDur / chunks.length;

    chunks.forEach((chunk, index) => {
      result.push({
        start: Math.round((seg.start + index * chunkDur) * 100) / 100,
        dur: Math.round(chunkDur * 100) / 100,
        text: chunk,
      });
    });
  }

  return result;
}

/**
 * Parses raw JSON3, SRV3 XML, Standard XML, or WebVTT timedtext response into TranscriptSegment[]
 */
export function parseTimedTextBody(bodyText: string, videoId = 'timedtext'): TranscriptSegment[] {
  if (!bodyText || bodyText.trim().length === 0) return [];
  const rawSegments: TranscriptSegment[] = [];
  const trimmed = bodyText.trim();

  // 1. JSON3 format
  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      if (data.events && Array.isArray(data.events)) {
        let index = 0;
        for (const ev of data.events) {
          if (!ev.segs || ev.tStartMs === undefined) continue;
          const text = ev.segs.map((s: any) => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
          const clean = collapseRollingCaption(decodeHTMLEntities(text));
          if (!clean) continue;

          const start = Math.round((ev.tStartMs / 1000) * 100) / 100;
          const dur = Math.max(1.2, Math.round(((ev.dDurationMs || 3000) / 1000) * 100) / 100);
          rawSegments.push({
            id: createCueId(videoId, start, index++),
            start,
            dur,
            text: clean,
            source: 'timedtext',
          });
        }
      }
      return rawSegments;
    } catch (jsonErr) {
      console.warn('[YouTube AI Translator] Failed parsing JSON3 timedtext:', jsonErr);
    }
  }

  // 2. WebVTT format
  if (trimmed.startsWith('WEBVTT') || trimmed.includes('-->')) {
    try {
      const lines = trimmed.split(/\r?\n/);
      let i = 0;
      let index = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        const timeMatch = line.match(/(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})/);
        if (timeMatch) {
          const h1 = parseInt(timeMatch[1] || '0', 10);
          const m1 = parseInt(timeMatch[2], 10);
          const s1 = parseInt(timeMatch[3], 10);
          const ms1 = parseInt(timeMatch[4], 10);
          const startTime = Math.round((h1 * 3600 + m1 * 60 + s1 + ms1 / 1000) * 100) / 100;

          const h2 = parseInt(timeMatch[5] || '0', 10);
          const m2 = parseInt(timeMatch[6], 10);
          const s2 = parseInt(timeMatch[7], 10);
          const ms2 = parseInt(timeMatch[8], 10);
          const endTime = h2 * 3600 + m2 * 60 + s2 + ms2 / 1000;
          const dur = Math.max(1.2, Math.round((endTime - startTime) * 100) / 100);

          i++;
          const textLines: string[] = [];
          while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
            textLines.push(lines[i].trim());
            i++;
          }
          const raw = textLines.join(' ').replace(/<[^>]+>/g, '').trim();
          const clean = collapseRollingCaption(decodeHTMLEntities(raw));
          if (clean) {
            rawSegments.push({
              id: createCueId(videoId, startTime, index++),
              start: startTime,
              dur,
              text: clean,
              source: 'timedtext',
            });
          }
        } else {
          i++;
        }
      }
      if (rawSegments.length > 0) return rawSegments;
    } catch (vttErr) {
      console.warn('[YouTube AI Translator] Failed parsing WebVTT timedtext:', vttErr);
    }
  }

  // 3. XML formats (SRV3 `<p t="..." d="...">` or Standard `<text start="..." dur="...">`)
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/xml');

    // Check SRV3 / format 3 `<p t="..." d="...">` (timestamps in milliseconds)
    const pEls = doc.getElementsByTagName('p');
    if (pEls.length > 0) {
      let index = 0;
      for (let i = 0; i < pEls.length; i++) {
        const el = pEls[i];
        const tAttr = el.getAttribute('t');
        if (tAttr === null) continue;
        const startMs = parseFloat(tAttr || '0');
        const durMs = parseFloat(el.getAttribute('d') || '3000');
        const raw = el.textContent || '';
        const clean = collapseRollingCaption(decodeHTMLEntities(raw.replace(/\n/g, ' ').trim()));
        if (!clean) continue;
        const start = Math.round((startMs / 1000) * 100) / 100;
        const dur = Math.max(1.2, Math.round((durMs / 1000) * 100) / 100);
        rawSegments.push({
          id: createCueId(videoId, start, index++),
          start,
          dur,
          text: clean,
          source: 'timedtext',
        });
      }
      if (rawSegments.length > 0) return rawSegments;
    }

    // Check standard format 1 `<text start="..." dur="...">` (timestamps in seconds)
    const textEls = doc.getElementsByTagName('text');
    if (textEls.length > 0) {
      let index = 0;
      for (let i = 0; i < textEls.length; i++) {
        const el = textEls[i];
        const start = parseFloat(el.getAttribute('start') || '0');
        const dur = parseFloat(el.getAttribute('dur') || '3');
        const raw = el.textContent || '';
        const clean = collapseRollingCaption(decodeHTMLEntities(raw.replace(/\n/g, ' ').trim()));
        if (!clean) continue;
        const startSec = Math.round(start * 100) / 100;
        const durSec = Math.max(1.2, Math.round(dur * 100) / 100);
        rawSegments.push({
          id: createCueId(videoId, startSec, index++),
          start: startSec,
          dur: durSec,
          text: clean,
          source: 'timedtext',
        });
      }
    }
  } catch (xmlErr) {
    console.warn('[YouTube AI Translator] Failed parsing XML timedtext:', xmlErr);
  }

  return rawSegments;
}

/**
 * Creates properly encoded timedtext URLs using URL searchParams instead of raw string concat
 */
export function createTimedTextUrl(
  baseUrl: string,
  format?: 'json3' | 'srv3' | 'vtt',
  targetLanguage?: string
): string {
  try {
    const url = new URL(baseUrl);
    if (format) {
      url.searchParams.set('fmt', format);
    }
    if (targetLanguage) {
      url.searchParams.set('tlang', targetLanguage);
    } else {
      url.searchParams.delete('tlang');
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export interface TimedTextFetchResult {
  ok: boolean;
  status: number;
  contentType: string;
  bodyLength: number;
  body: string;
  segments: TranscriptSegment[];
  format: 'json3' | 'srv3' | 'xml' | 'vtt' | 'unknown';
  error?: string;
}

/**
 * Robustly fetches and parses timedtext from YouTube with credentials, 429 rate limit protection, and structured logging
 */
export async function fetchAndParseTimedText(
  sourceUrl: string,
  signal?: AbortSignal,
  videoId = 'timedtext'
): Promise<TimedTextFetchResult> {
  if (isTimedTextBlocked(videoId)) {
    console.warn(`[AI Subtitles] ⏸️ Skipping timedtext fetch for ${videoId} due to active 429 cooldown`);
    return {
      ok: false,
      status: 429,
      contentType: '',
      bodyLength: 0,
      body: '',
      segments: [],
      format: 'unknown',
      error: 'TimedText circuit breaker active (rate limited)',
    };
  }

  try {
    const response = await fetch(sourceUrl, {
      credentials: 'include',
      signal,
    });

    if (response.status === 429) {
      recordTimedTextRateLimit(videoId);
    }

    const body = await response.text();
    const segments = response.ok ? parseTimedTextBody(body, videoId) : [];
    const format = detectTimedTextFormat(body);

    const isSuccess = response.ok && segments.length > 0;
    if (isSuccess) {
      console.log(
        `[AI Subtitles] Caption request OK: status=${response.status} format=${format} bytes=${body.length} parsedCues=${segments.length}`
      );
    } else {
      console.warn(
        `[AI Subtitles] Caption request empty or failed: status=${response.status} format=${format} bytes=${body.length} parsedCues=${segments.length}`
      );
    }

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      bodyLength: body.length,
      body,
      segments,
      format,
      error: response.ok ? undefined : `Caption request failed with HTTP ${response.status}`,
    };
  } catch (error: any) {
    console.warn('[AI Subtitles] Caption fetch exception:', error?.message || error);
    return {
      ok: false,
      status: 0,
      contentType: '',
      bodyLength: 0,
      body: '',
      segments: [],
      format: 'unknown',
      error: error instanceof Error ? error.message : 'Caption request failed',
    };
  }
}

/**
 * Parses timestamp string like "0:10", "1:06", "14:46", or "0:1010 seconds"
 */
export function parseTimestampToSeconds(text: string): number {
  if (!text) return 0;
  const cleaned = text.trim();

  const match = cleaned.match(/(?:(\d+):)?(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const numMatch = cleaned.match(/^(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return 0;
}

// ─── Modern YouTube Transcript DOM Selectors & Extractor ─────────────────────

export const TRANSCRIPT_PANEL_SELECTORS = [
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
  'ytd-transcript-renderer',
  'ytd-transcript-search-panel-renderer',
  'macro-markers-list-view-model',
  '#panels ytd-engagement-panel-section-list-renderer',
];

export const TRANSCRIPT_SEGMENT_SELECTORS = [
  'transcript-segment-view-model',
  'ytd-transcript-segment-renderer',
  '[class*="TranscriptSegmentViewModel"]',
];

export const TIMESTAMP_SELECTORS = [
  '.ytwTranscriptSegmentViewModelTimestamp',
  '.segment-timestamp',
  '[class*="Timestamp"]',
];

export const TEXT_SELECTORS = [
  '.ytAttributedStringHost',
  '.segment-text',
  'span[role="text"]',
  'yt-formatted-string',
];

export function queryFirst(root: ParentNode, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element instanceof HTMLElement) {
      return element;
    }
  }
  return null;
}

export function queryAllUnique(root: ParentNode, selectors: string[]): HTMLElement[] {
  const result = new Set<HTMLElement>();
  for (const selector of selectors) {
    root.querySelectorAll(selector).forEach((element) => {
      if (element instanceof HTMLElement) {
        result.add(element);
      }
    });
  }
  return [...result];
}

export function findTranscriptPanel(): HTMLElement | null {
  for (const selector of TRANSCRIPT_PANEL_SELECTORS) {
    const panels = document.querySelectorAll(selector);
    for (const panel of panels) {
      if (!(panel instanceof HTMLElement)) continue;
      const style = window.getComputedStyle(panel);
      const visible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        panel.getBoundingClientRect().height > 0;
      if (visible) {
        return panel;
      }
    }
  }
  return null;
}

export function findShowTranscriptButton(): HTMLElement | null {
  const direct = queryFirst(document, [
    'button[aria-label="Show transcript" i]',
    'ytd-video-description-transcript-section-renderer button',
    '[aria-label*="transcript" i]',
  ]);
  if (direct) return direct;

  return (
    Array.from(
      document.querySelectorAll<HTMLElement>('button, tp-yt-paper-button, yt-button-shape button')
    ).find((element) => {
      const label = [
        element.textContent,
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        label.includes('show transcript') ||
        label.includes('transcript') ||
        label.includes('transkript')
      );
    }) ?? null
  );
}

export function parseTranscriptSegment(element: HTMLElement, videoId = 'dom', index = 0): TranscriptSegment | null {
  const timestampElement = queryFirst(element, TIMESTAMP_SELECTORS);
  const timestampText = timestampElement?.textContent?.trim() ?? '';
  const timestamp = parseTimestampToSeconds(timestampText);

  const textCandidates = queryAllUnique(element, TEXT_SELECTORS);
  const text = textCandidates
    .map((candidate) => candidate.textContent?.trim() ?? '')
    .filter(Boolean)
    .filter((value) => value !== timestampText)
    .sort((a, b) => b.length - a.length)[0];

  const normalizedText = collapseRollingCaption(text ?? '');
  if (!normalizedText) return null;

  return {
    id: createCueId(videoId, timestamp, index),
    start: timestamp,
    dur: 0,
    text: normalizedText,
    source: 'transcript-dom',
  };
}

export function findScrollableTranscriptContainer(panel: HTMLElement): HTMLElement {
  const candidates = [
    panel.querySelector<HTMLElement>('#content'),
    ...Array.from(panel.querySelectorAll<HTMLElement>('*')),
  ].filter((element): element is HTMLElement => element instanceof HTMLElement);

  return (
    candidates.find((element) => {
      const style = window.getComputedStyle(element);
      return (
        /(auto|scroll)/.test(style.overflowY) &&
        element.scrollHeight > element.clientHeight + 20
      );
    }) ?? panel
  );
}

export async function collectVirtualizedTranscript(
  panel: HTMLElement,
  signal?: AbortSignal,
  videoId = 'video',
  timingSettings: Partial<SubtitleTimingSettings> | Partial<ExtensionSettings> = DEFAULT_TIMING
): Promise<TranscriptSegment[]> {
  const scrollContainer = findScrollableTranscriptContainer(panel);
  const collected = new Map<string, TranscriptSegment>();

  let unchangedPasses = 0;
  let previousSize = 0;
  let previousScrollTop = -1;

  scrollContainer.scrollTop = 0;
  await new Promise((r) => setTimeout(r, 150));

  for (let pass = 0; pass < 300; pass++) {
    if (signal?.aborted) {
      throw new DOMException('Transcript extraction cancelled', 'AbortError');
    }

    const elements = queryAllUnique(panel, TRANSCRIPT_SEGMENT_SELECTORS);
    for (let elIdx = 0; elIdx < elements.length; elIdx++) {
      const element = elements[elIdx];
      const segment = parseTranscriptSegment(element, videoId, elIdx);
      if (!segment) continue;

      const key = `${segment.start.toFixed(3)}|${segment.text}`;
      if (!collected.has(key)) {
        collected.set(key, segment);
      }
    }

    if (collected.size === previousSize) {
      unchangedPasses++;
    } else {
      unchangedPasses = 0;
      previousSize = collected.size;
    }

    const atBottom =
      scrollContainer.scrollTop + scrollContainer.clientHeight >=
      scrollContainer.scrollHeight - 8;

    if (atBottom && unchangedPasses >= 3) {
      break;
    }

    previousScrollTop = scrollContainer.scrollTop;
    scrollContainer.scrollTop = Math.min(
      scrollContainer.scrollTop + Math.max(240, scrollContainer.clientHeight * 0.75),
      scrollContainer.scrollHeight
    );

    scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 120));

    if (scrollContainer.scrollTop === previousScrollTop && atBottom) {
      break;
    }
  }

  scrollContainer.scrollTop = 0;

  const rawSegments = [...collected.values()].sort((a, b) => a.start - b.start);

  // Assign deterministic sequential cue IDs
  const segments = rawSegments.map((s, idx) => ({
    ...s,
    id: createCueId(videoId, s.start, idx),
  }));

  // Calculate adaptive reading duration and preserve intentional silent gaps
  const resolved = resolveTimingSettings(timingSettings);
  for (let index = 0; index < segments.length; index++) {
    const current = segments[index];
    const next = segments[index + 1];
    current.dur = calculateCueDuration(current, next, current.text, resolved);
  }

  return segments;
}

/**
 * Extracts the complete video transcript from YouTube's modern transcript UI with virtualization scrolling
 */
export async function extractFullTranscriptFromDOM(
  signal?: AbortSignal,
  videoId = 'video',
  timingSettings: Partial<SubtitleTimingSettings> | Partial<ExtensionSettings> = DEFAULT_TIMING
): Promise<TranscriptSegment[]> {
  console.log('[AI Subtitles] 🔍 Scanning for modern transcript panel in YouTube DOM...');

  let panel = findTranscriptPanel();
  const wasAlreadyOpen = panel !== null;

  if (!panel) {
    // 1. Expand description if needed
    const expandBtn = queryFirst(document, [
      'ytd-text-inline-expander #expand',
      '#description-inline-expander #expand',
      'tp-yt-paper-button#expand',
      'button[aria-label*="more" i]',
    ]);
    expandBtn?.click();
    await new Promise((r) => setTimeout(r, 250));

    // 2. Click Show Transcript button
    const transcriptBtn = findShowTranscriptButton();
    if (transcriptBtn) {
      transcriptBtn.click();
      console.log('[AI Subtitles] 📜 Clicked "Show transcript" button...');
    }

    // 3. Wait up to 8s for modern transcript panel and segment models
    const started = performance.now();
    while (performance.now() - started < 8000) {
      if (signal?.aborted) return [];
      panel = findTranscriptPanel();
      if (panel) {
        const segs = queryAllUnique(panel, TRANSCRIPT_SEGMENT_SELECTORS);
        if (segs.length > 0) break;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  if (!panel) {
    console.warn('[AI Subtitles] ⚠️ Modern transcript panel not found.');
    return [];
  }

  console.log('[AI Subtitles] 📜 Collecting virtualized transcript rows...');
  const collectedSegments = await collectVirtualizedTranscript(panel, signal, videoId, timingSettings);
  logTrackStage('dom-collected', collectedSegments);

  // If the extension opened the transcript panel, close it using native close button
  if (!wasAlreadyOpen && panel) {
    const closeBtn = queryFirst(panel, [
      'button[aria-label*="close" i]',
      'button[aria-label*="Close" i]',
      'button[aria-label*="schließen" i]',
      '#visibility-button button',
    ]);
    closeBtn?.click();
  }

  // Merge adjacent duplicate speech-to-text cues (e.g. repeated breath/sigh labels)
  const { cues: normalizedSegments } = mergeAdjacentDuplicateCues(
    collectedSegments,
    timingSettings.duplicateMergeGap || 1.0
  );
  logTrackStage('duplicates-merged', normalizedSegments);

  console.log(
    `[AI Subtitles] ✅ Successfully collected ${normalizedSegments.length} transcript cues from modern DOM!`
  );
  return normalizedSegments;
}

export interface TrackValidation {
  valid: boolean;
  completeness: 'full' | 'partial' | 'live' | 'invalid';
  cueCount: number;
  firstStart: number | null;
  lastEnd: number | null;
  coveredDuration: number;
  reason?: string;
}

/**
 * Validates whether an extracted subtitle track represents a complete, partial, or single live capture
 */
export function validateSubtitleTrack(
  segments: TranscriptSegment[],
  videoDuration = 0
): TrackValidation {
  if (!segments || segments.length === 0) {
    return {
      valid: false,
      completeness: 'invalid',
      cueCount: 0,
      firstStart: null,
      lastEnd: null,
      coveredDuration: 0,
      reason: 'No subtitle cues were extracted.',
    };
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const firstStart = sorted[0].start;
  const last = sorted[sorted.length - 1];
  const lastEnd = last.start + last.dur;
  const coveredDuration = Math.max(0, lastEnd - firstStart);

  if (segments.length === 1 && videoDuration > 30) {
    return {
      valid: true,
      completeness: 'live',
      cueCount: 1,
      firstStart,
      lastEnd,
      coveredDuration,
      reason: 'Only one live cue is available.',
    };
  }

  const coverageRatio = videoDuration > 0 ? coveredDuration / videoDuration : 0.8;

  return {
    valid: true,
    completeness: coverageRatio >= 0.6 || segments.length >= 10 ? 'full' : 'partial',
    cueCount: segments.length,
    firstStart,
    lastEnd,
    coveredDuration: Math.round(coveredDuration * 10) / 10,
  };
}

/**
 * Fetches timed text captions directly from YouTube's internal player data / timedtext API
 * Supports multi-format fallback (json3 -> srv3 -> vtt) and returns all parsed cues.
 */
export async function fetchDirectYouTubeCaptions(
  videoId: string,
  targetLang = 'English',
  isBilingual = false,
  signal?: AbortSignal
): Promise<TranslatedSegment[]> {
  if (isTimedTextBlocked(videoId)) {
    console.warn(`[AI Subtitles] ⏸️ Skipping timedtext fetch for ${videoId} due to active 429 cooldown.`);
    return [];
  }

  try {
    let captionTracks: any[] = [];

    // 1. Check movie_player player response in page context
    try {
      const moviePlayer = document.getElementById('movie_player') as any;
      const playerResponse = moviePlayer?.getPlayerResponse?.();
      if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
        captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
      }
    } catch {}

    // 2. Scan page script tags safely
    if (!captionTracks || captionTracks.length === 0) {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const txt = s.textContent || '';
        if (txt.includes('captionTracks')) {
          const match = txt.match(/"captionTracks":\s*(\[.*?\])/);
          if (match && match[1]) {
            try {
              captionTracks = JSON.parse(match[1]);
              break;
            } catch {}
          }
        }
      }
    }

    if (!captionTracks || captionTracks.length === 0) {
      console.warn('[AI Subtitles] ⚠️ No direct captionTracks found in player context, trying DOM extractor...');
      return [];
    }

    console.log(
      `[AI Subtitles] Track discovered: ${captionTracks.length} official track(s):`,
      captionTracks.map((c) => `language=${c.languageCode} (${c.name?.simpleText || c.name?.runs?.[0]?.text || ''})`)
    );

    const targetCode = getLanguageCode(targetLang);
    const exactTrack = captionTracks.find(
      (c) => c.languageCode === targetCode || c.languageCode?.startsWith(targetCode + '-')
    );
    const baseTrack = captionTracks[0];

    const formats: Array<'json3' | 'srv3' | 'vtt'> = ['json3', 'srv3', 'vtt'];

    // 1. If target translation requested via YouTube auto-translate, try formats
    let translatedRaw: TranscriptSegment[] = [];
    if (exactTrack) {
      for (const fmt of formats) {
        if (isTimedTextBlocked(videoId)) break;
        const url = createTimedTextUrl(exactTrack.baseUrl, fmt);
        const res = await fetchAndParseTimedText(url, signal, videoId);
        if (res.segments.length > 0) {
          translatedRaw = res.segments;
          break;
        }
        if (res.status === 429) break;
      }
    } else {
      for (const fmt of formats) {
        if (isTimedTextBlocked(videoId)) break;
        const url = createTimedTextUrl(baseTrack.baseUrl, fmt, targetCode);
        const res = await fetchAndParseTimedText(url, signal, videoId);
        if (res.segments.length > 0) {
          translatedRaw = res.segments;
          break;
        }
        if (res.status === 429) break;
      }
    }

    // 2. Fetch original base track (e.g. Japanese) across formats
    let originalRaw: TranscriptSegment[] = [];
    if (
      !isTimedTextBlocked(videoId) &&
      (translatedRaw.length === 0 || (isBilingual && baseTrack.languageCode !== targetCode))
    ) {
      for (const fmt of formats) {
        if (isTimedTextBlocked(videoId)) break;
        const url = createTimedTextUrl(baseTrack.baseUrl, fmt);
        const res = await fetchAndParseTimedText(url, signal, videoId);
        if (res.segments.length > 0) {
          originalRaw = res.segments;
          break;
        }
        if (res.status === 429) break;
      }
    }

    if (translatedRaw.length === 0 && originalRaw.length === 0) {
      console.warn('[AI Subtitles] ⚠️ Both translated & original timedtext returned empty across formats.');
      return [];
    }

    const primaryTrack = translatedRaw.length > 0 ? translatedRaw : originalRaw;

    // Map cues with IDs and metadata
    const translatedSegments: TranslatedSegment[] = primaryTrack.map((cue, idx) => {
      let origText = cue.text;
      let transText = cue.text;

      if (translatedRaw.length > 0) {
        transText = cue.text;
        if (originalRaw.length > 0) {
          const match = originalRaw.find((o) => Math.abs(o.start - cue.start) <= 1.2);
          if (match) {
            origText = match.text;
          }
        }
      } else {
        origText = cue.text;
        transText = cue.text;
      }

      return {
        id: cue.id || createCueId(videoId, cue.start, idx),
        start: cue.start,
        dur: cue.dur,
        text: origText,
        translatedText: transText,
        source: 'timedtext',
        translationStatus: translatedRaw.length > 0 ? 'translated' : 'fallback',
      };
    });

    console.log(
      `[AI Subtitles] ⚡ Successfully extracted ${translatedSegments.length} direct timed subtitle cues!`
    );
    return translatedSegments;
  } catch (err) {
    console.warn('[AI Subtitles] Direct timedtext fetch exception:', err);
    return [];
  }
}

/**
 * Formats seconds into standard SRT timestamp format: HH:MM:SS,mmm
 */
export function formatSecondsToSRTTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Exports subtitle segments to standard SubRip (.srt) format.
 */
export function exportToSRT(
  segments: TranslatedSegment[],
  mode: 'translated' | 'original' | 'bilingual' = 'translated'
): string {
  if (!segments || segments.length === 0) return '';

  return segments
    .map((seg, idx) => {
      const index = idx + 1;
      const start = formatSecondsToSRTTime(seg.start);
      const end = formatSecondsToSRTTime(seg.start + seg.dur);

      let text = '';
      if (mode === 'original') {
        text = seg.text || seg.translatedText || '';
      } else if (mode === 'bilingual') {
        text = seg.text ? `${seg.text}\n${seg.translatedText}` : seg.translatedText;
      } else {
        text = seg.translatedText || seg.text || '';
      }

      return `${index}\n${start} --> ${end}\n${text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Exports subtitle segments and diagnostic metadata to JSON format.
 */
export function exportToJSON(segments: TranslatedSegment[], metadata: Record<string, any> = {}): string {
  const data = {
    exportedAt: new Date().toISOString(),
    totalCues: segments.length,
    metadata,
    subtitles: segments.map((seg, idx) => ({
      index: idx + 1,
      startSeconds: seg.start,
      durationSeconds: seg.dur,
      endSeconds: Math.round((seg.start + seg.dur) * 100) / 100,
      originalText: seg.text,
      translatedText: seg.translatedText,
    })),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Determines whether a full track export is permitted.
 * Requires ready phase and full alignment between source and translated cue counts.
 */
export function canExportFullTrack(phase: string, sourceCount: number, translatedCount: number): boolean {
  return (phase === 'ready' || phase === 'full') && sourceCount > 0 && sourceCount === translatedCount;
}

/**
 * Triggers a browser download of a text/data file.
 */
export function triggerBrowserDownload(content: string, filename: string, mimeType = 'text/plain;charset=utf-8'): void {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('[YouTube AI Translator] Failed to trigger download:', err);
  }
}
