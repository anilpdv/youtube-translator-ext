export function createSubtitleFilename(videoId: string, language: string): string {
  const safe = `${videoId}-${language}`.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return `${safe || 'subtitles'}.srt`;
}
