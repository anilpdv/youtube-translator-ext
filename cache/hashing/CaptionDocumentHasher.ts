import type { CaptionDocument } from '../../captions/domain/CaptionDocument';
import type { CaptionCue } from '../../captions/domain/CaptionCue';
import type { SourceTranslationCue } from '../../translation/domain/TranslationCue';
import { stableStringify } from './StableJsonSerializer';
import { sha256 } from './sha256';

const cueValue = (cue: CaptionCue | SourceTranslationCue) => ({
  id: cue.id, startMs: cue.startMs, endMs: cue.endMs, text: cue.text,
});

export async function hashCaptionDocument(document: CaptionDocument): Promise<string> {
  return sha256(stableStringify(document.cues.map(cueValue)));
}

export async function hashTranslationBatch(
  cues: readonly SourceTranslationCue[],
): Promise<string> {
  return sha256(stableStringify(cues.map(cueValue)));
}
