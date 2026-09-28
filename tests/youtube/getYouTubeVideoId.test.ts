import { describe, expect, it } from 'vitest';
import { getYouTubeVideoId } from '../../youtube/getYouTubeVideoId';

describe('getYouTubeVideoId', () => {
  it('reads standard watch URLs', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=abc123XYZ_1')).toBe(
      'abc123XYZ_1',
    );
  });

  it('rejects unsupported pages and malformed IDs', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/shorts/abc123')).toBeNull();
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(getYouTubeVideoId('https://example.com/watch?v=abc123')).toBeNull();
  });

  it('supports youtu.be watch links', () => {
    expect(getYouTubeVideoId('https://youtu.be/abc123XYZ_1')).toBe('abc123XYZ_1');
  });
});
