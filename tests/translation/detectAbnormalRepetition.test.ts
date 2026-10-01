import { describe, expect, it } from 'vitest';
import { detectAbnormalRepetition } from '../../translation/validation/detectAbnormalRepetition';
describe('detectAbnormalRepetition', () => {
  it('flags repeated clauses but permits ordinary short repetition', () => {
    expect(detectAbnormalRepetition({ sourceText: 'hello', translatedText: 'same phrase repeats same phrase repeats same phrase repeats' }).repetitive).toBe(true);
    expect(detectAbnormalRepetition({ sourceText: 'very very good', translatedText: 'très très bon' }).repetitive).toBe(false);
  });
});
