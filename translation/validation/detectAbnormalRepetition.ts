import type { RepetitionReport } from './RepetitionReport';
export const REPETITION_LIMITS = { maximumLengthRatio: 3, maximumRepeatedTokenRatio: 0.35, minimumRepeatedNgramSize: 3, maximumRepeatedNgramSize: 8, minimumPhraseOccurrences: 3 } as const;
const tokenize = (text: string) => text.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
export function detectAbnormalRepetition(input: { sourceText: string; translatedText: string; languageCode?: string }): RepetitionReport {
  const source = tokenize(input.sourceText); const translated = tokenize(input.translatedText);
  const lengthRatio = translated.length / Math.max(1, source.length);
  const phrases: string[] = []; const repeated = new Set<number>();
  for (let size = REPETITION_LIMITS.minimumRepeatedNgramSize; size <= Math.min(REPETITION_LIMITS.maximumRepeatedNgramSize, translated.length); size += 1) {
    const occurrences = new Map<string, number[]>();
    for (let i = 0; i <= translated.length - size; i += 1) {
      const phrase = translated.slice(i, i + size).join(' ');
      occurrences.set(phrase, [...(occurrences.get(phrase) ?? []), i]);
    }
    for (const [phrase, positions] of occurrences) if (positions.length >= REPETITION_LIMITS.minimumPhraseOccurrences) {
      phrases.push(phrase); positions.forEach((position) => { for (let i = position; i < position + size; i += 1) repeated.add(i); });
    }
  }
  const sentences = input.translatedText.split(/(?<=[.!?。！？])\s+/u).map((s) => s.trim()).filter(Boolean);
  const consecutive = sentences.some((sentence, index) => index > 0 && sentence === sentences[index - 1]);
  const repeatedTokenRatio = repeated.size / Math.max(1, translated.length);
  return { repetitive: consecutive || (lengthRatio > REPETITION_LIMITS.maximumLengthRatio && repeatedTokenRatio > REPETITION_LIMITS.maximumRepeatedTokenRatio) || phrases.length > 0,
    repeatedTokenRatio, translationSourceLengthRatio: lengthRatio, repeatedPhrases: phrases };
}
