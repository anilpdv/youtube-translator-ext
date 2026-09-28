import { describe, expect, it } from 'vitest';
import { TranslationResponseParser } from '../../translation/validation/TranslationResponseParser';
import { TranslationResponseValidator } from '../../translation/validation/TranslationResponseValidator';
import { DEFAULT_TRANSLATION_LIMITS } from '../../translation/domain/TranslationLimits';
import type { TranslationBatch } from '../../translation/domain/TranslationBatch';

const batch: TranslationBatch = {
  id: 'video:0:a:b',
  index: 0,
  characterCount: 8,
  estimatedCost: 2,
  cues: [
    { id: 'a', startMs: 0, endMs: 1_000, text: 'Hello' },
    { id: 'b', startMs: 1_000, endMs: 2_000, text: 'World' },
  ],
};

describe('TranslationResponseValidator', () => {
  const parser = new TranslationResponseParser();
  const validator = new TranslationResponseValidator(
    DEFAULT_TRANSLATION_LIMITS,
  );

  it('restores provider output to source cue order', () => {
    const result = validator.validate(batch, parser.parse('```json\n' +
      '[{"id":"b","translation":"Monde"},{"id":"a","translation":"Bonjour"}]\n```'));
    expect(result.map((cue) => cue.id)).toEqual(['a', 'b']);
  });

  it('rejects missing cue IDs', () => {
    expect(() =>
      validator.validate(batch, parser.parse('[{"id":"a","translation":"Bonjour"}]')),
    ).toThrow('omitted a required cue');
  });

  it('rejects duplicate cue IDs', () => {
    expect(() =>
      validator.validate(
        batch,
        parser.parse(
          '[{"id":"a","translation":"Bonjour"},{"id":"a","translation":"Salut"},{"id":"b","translation":"Monde"}]',
        ),
      ),
    ).toThrow('more than once');
  });
});
