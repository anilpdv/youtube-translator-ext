import type { SubtitlePhraseCard } from '../domain/SubtitlePhraseCard';

export type PhraseBoundaryStrength = 'none' | 'weak' | 'clause' | 'sentence' | 'silence';

export interface PhraseBoundary {
  readonly strength: PhraseBoundaryStrength;
  readonly reason: SubtitlePhraseCard['boundaryReason'];
}

export function classifyPhraseBoundary(input: {
  readonly currentText: string;
  readonly currentEndMs: number;
  readonly nextStartMs: number | null;
  readonly minimumSilenceMs: number;
}): PhraseBoundary {
  const text = input.currentText.trim();

  if (/[.!?…]["')\]]?$/.test(text)) {
    return { strength: 'sentence', reason: 'sentence' };
  }

  const gapMs = input.nextStartMs === null ? 0 : input.nextStartMs - input.currentEndMs;
  if (gapMs >= input.minimumSilenceMs) {
    return { strength: 'silence', reason: 'silence' };
  }

  if (/[,;:]["')\]]?$/.test(text) || /[-–—]["')\]]?$/.test(text)) {
    return { strength: 'clause', reason: 'punctuation' };
  }

  return { strength: 'none', reason: 'source-cue-end' };
}
