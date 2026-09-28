import type { CacheLimits } from '../domain/CacheLimits';
import type { TranslationCacheRecord } from '../domain/TranslationCacheRecord';

export function recordsToRemove(
  records: readonly TranslationCacheRecord[],
  limits: CacheLimits,
  now = Date.now(),
): readonly TranslationCacheRecord[] {
  const expired = records.filter((record) => {
    const age = now - record.lastAccessedAt;
    const limit = record.completion === 'partial' ? limits.incompleteMaximumAgeMs : limits.maximumAgeMs;
    return age > limit;
  });
  const remaining = records.filter((record) => !expired.includes(record))
    .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
  let count = remaining.length;
  let bytes = remaining.reduce((sum, record) => sum + record.approximateSizeBytes, 0);
  const removed = [...expired];
  for (const record of remaining) {
    if (count <= limits.maxRecordCount && bytes <= limits.maxTotalBytes) break;
    removed.push(record);
    count -= 1;
    bytes -= record.approximateSizeBytes;
  }
  return removed;
}
