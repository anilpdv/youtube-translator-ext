import type { SubtitleDisplayPlannerOptions } from './SubtitleDisplayPlannerOptions';
export interface ReadableTextChunk { readonly text: string; readonly readingWeight: number; }
function parts(text: string, language: string, granularity: 'sentence' | 'word' | 'grapheme') {
  if (typeof Intl.Segmenter === 'undefined') return [];
  return Array.from(new Intl.Segmenter(language, { granularity }).segment(text));
}
function countUnits(text: string, language: string): number {
  const words = parts(text, language, 'word').filter((part) => part.isWordLike);
  return words.length || Math.max(1, parts(text, language, 'grapheme').length);
}
export function splitReadableText(text: string, languageCode: string, options: SubtitleDisplayPlannerOptions): readonly ReadableTextChunk[] {
  const limit = options.maxCharactersPerLine * options.maxLines;
  const sentenceParts = parts(text, languageCode, 'sentence').map((part) => part.segment);
  const chunks: ReadableTextChunk[] = [];
  for (const sentence of sentenceParts.length ? sentenceParts : [text]) {
    const units = countUnits(sentence, languageCode);
    if (sentence.trim().length <= limit && units <= options.maxWordsPerSlice) {
      chunks.push({ text: sentence.trim(), readingWeight: Math.max(1, units) });
      continue;
    }
    const wordParts = parts(sentence, languageCode, 'word');
    const usable = wordParts.length ? wordParts : parts(sentence, languageCode, 'grapheme');
    let current = ''; let currentUnits = 0;
    const flush = () => { const value = current.trim(); if (value) chunks.push({ text: value, readingWeight: Math.max(1, currentUnits) }); current = ''; currentUnits = 0; };
    for (const part of usable) {
      const weight = part.isWordLike === false ? 0 : 1;
      if (current && (current.length + part.segment.length > limit || currentUnits + weight > options.maxWordsPerSlice)) flush();
      current += part.segment; currentUnits += weight;
      if (/[,;:!?。！？]\s*$/u.test(current) && current.length >= limit / 2) flush();
    }
    flush();
  }
  return chunks.filter((chunk) => chunk.text.length > 0);
}
