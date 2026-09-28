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
      text: cue.text,
    }));
    return [
      'Translate each subtitle cue.',
      languageInstruction(input.sourceLanguage, input.targetLanguage),
      '',
      'Return valid JSON only as [{"id":"cue-id","translation":"translated text"}].',
      'Preserve every cue ID exactly. Do not combine or split cues.',
      '',
      `Input:\n${JSON.stringify(payload)}`,
    ].join('\n');
  }
}
