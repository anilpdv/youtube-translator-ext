import type { TimedTextUnit } from './PhraseAccumulator';

const NO_SPACE_BEFORE = /^[,.;:!?…)\]'"%]+$/;
const NO_SPACE_AFTER = /^[(\['"]$/;

export function joinCaptionUnitText(values: readonly string[]): string {
  let result = '';

  for (const raw of values) {
    const text = raw.trim();
    if (!text) continue;

    if (!result) {
      result = text;
    } else if (NO_SPACE_BEFORE.test(text) || NO_SPACE_AFTER.test(result.at(-1) ?? '')) {
      result += text;
    } else {
      result += ` ${text}`;
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

export function joinCaptionUnits(units: readonly TimedTextUnit[]): string {
  return joinCaptionUnitText(units.map((unit) => unit.text));
}

export function countReadingUnits(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(normalized)) {
    return Array.from(normalized.replace(/\s+/g, '')).length;
  }
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function estimateCaptionLines(text: string, maximumCharactersPerLine: number): number {
  const maxChars = Math.max(1, maximumCharactersPerLine);
  const lines: string[] = [];
  let current = '';

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return Math.max(1, lines.length);
}

export function wrapCaptionText(
  text: string,
  maximumCharactersPerLine: number,
  _maximumLines: number,
): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const maxChars = Math.max(1, maximumCharactersPerLine);
  const lines: string[] = [];
  let current = '';

  for (const word of normalized.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.join('\n');
}
