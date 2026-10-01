import { describe, expect, it } from 'vitest';
import { extractRollingDelta } from '../../captions/normalization/extractRollingDelta';
describe('extractRollingDelta', () => {
  it('removes cumulative prefixes while preserving punctuation', () => {
    expect(extractRollingDelta('Hello brave world', 'Hello brave world, again!')).toMatchObject({ text: 'again!', relationship: 'extension' });
  });
  it('retains unrelated and Unicode text', () => {
    expect(extractRollingDelta('مرحبا بالعالم', 'نص جديد', 'ar').text).toBe('نص جديد');
  });
  it('supports CJK segmentation without whitespace', () => {
    expect(extractRollingDelta('今日は良い', '今日は良い天気です', 'ja').text.length).toBeGreaterThan(0);
  });
});
