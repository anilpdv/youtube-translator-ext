import type { TimedReadableChunk } from './allocateSliceTimings';
export function createRollingWindows(chunks: readonly TimedReadableChunk[], windowSize: number): readonly TimedReadableChunk[] {
  const size = Math.max(1, windowSize);
  return chunks.map((chunk, index) => ({ ...chunk, text: chunks.slice(Math.max(0, index - size + 1), index + 1).map((entry) => entry.text).join('\n') }));
}
