import type { TranslationBatch } from '../domain/TranslationBatch';
import { languageInstruction } from './languageInstructions';

export interface TranslationPromptInput {
  readonly batch: Pick<TranslationBatch, 'id' | 'index' | 'cues'>;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
}

export class TranslationPromptBuilder {
  build(input: TranslationPromptInput): string {
    const payload = input.batch.cues.map((cue) => ({
      id: cue.id,
      parentCueId: cue.parentCueId,
      text: cue.text,
      context: { previous: cue.context?.previousText ?? null, next: cue.context?.nextText ?? null },
    }));
    return [
      'Translate each subtitle phrase card.',
      languageInstruction(input.sourceLanguage, input.targetLanguage),
      '',
      'Return valid JSON only as [{"id":"cue-id","translation":"translated text"}].',
      'Translate only each text value. Context is for grammar and word choice only.',
      'Do not translate context, combine cues, repeat neighboring text, or return alternatives.',
      'Return exactly one concise translation per phrase ID. Preserve every phrase ID exactly. Do not split or combine phrase cards.',
      '',
      `Input:\n${JSON.stringify(payload)}`,
    ].join('\n');
  }
}
