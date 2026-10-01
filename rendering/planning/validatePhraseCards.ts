import type { SubtitlePhraseCard } from '../domain/SubtitlePhraseCard';

const normalizeWords = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean);

export function hasLargeTextOverlap(previous: string, next: string): boolean {
  const previousWords = normalizeWords(previous);
  const nextWords = normalizeWords(next);
  if (previousWords.length < 4 || nextWords.length < 4) return false;

  const prefix = nextWords.slice(0, Math.min(5, nextWords.length)).join(' ');
  return previousWords.join(' ').includes(prefix);
}

export function validatePhraseCards(cards: readonly SubtitlePhraseCard[]): void {
  let previousEnd = -1;
  const ids = new Set<string>();

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    if (!card.id || ids.has(card.id)) throw new Error(`Invalid duplicate phrase card id: ${card.id}`);
    if (card.endMs <= card.startMs) throw new Error(`Invalid phrase card timing: ${card.id}`);
    if (card.startMs < previousEnd) throw new Error(`Overlapping phrase card: ${card.id}`);
    if (index > 0 && hasLargeTextOverlap(cards[index - 1].originalText, card.originalText)) {
      throw new Error(`Phrase card repeats previous text: ${card.id}`);
    }
    ids.add(card.id);
    previousEnd = card.endMs;
  }
}
