import type { ReadableTextChunk } from './splitReadableText';
import type { SubtitleDisplayPlannerOptions } from './SubtitleDisplayPlannerOptions';
export interface TimedReadableChunk { readonly text: string; readonly startMs: number; readonly endMs: number; }
function reduceToFit(chunks: readonly ReadableTextChunk[], duration: number, minimum: number) {
  const allowed = Math.max(1, Math.floor(duration / minimum));
  if (chunks.length <= allowed) return [...chunks];
  const result: ReadableTextChunk[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const target = Math.min(allowed - 1, Math.floor(i * allowed / chunks.length));
    const prior = result[target];
    result[target] = prior ? { text: `${prior.text} ${chunks[i].text}`, readingWeight: prior.readingWeight + chunks[i].readingWeight } : chunks[i];
  }
  return result;
}
export function allocateSliceTimings(chunks: readonly ReadableTextChunk[], startMs: number, endMs: number, options: SubtitleDisplayPlannerOptions): readonly TimedReadableChunk[] {
  if (!chunks.length || endMs <= startMs) return [];
  const reduced = reduceToFit(chunks, endMs - startMs, options.minimumSliceDurationMs);
  let remainingWeight = reduced.reduce((sum, chunk) => sum + Math.max(1, chunk.readingWeight), 0);
  let cursor = startMs;
  return reduced.map((chunk, index) => {
    const last = index === reduced.length - 1;
    const remaining = reduced.length - index - 1;
    const ideal = Math.round((endMs - cursor) * Math.max(1, chunk.readingWeight) / remainingWeight);
    const duration = Math.max(options.minimumSliceDurationMs, Math.min(options.maximumSliceDurationMs, ideal));
    const next = last ? endMs : Math.min(endMs - remaining * options.minimumSliceDurationMs, cursor + duration);
    const result = { text: chunk.text, startMs: cursor, endMs: next };
    cursor = next; remainingWeight -= Math.max(1, chunk.readingWeight);
    return result;
  });
}
