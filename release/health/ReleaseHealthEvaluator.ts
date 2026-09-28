import type { ReleaseHealth } from './ReleaseHealth';
export function evaluateReleaseHealth(input: { channel: ReleaseHealth['channel']; version: string; errorRate: number; completionRate: number; maxErrorRate?: number; minCompletionRate?: number }): ReleaseHealth {
  const maxErrorRate = input.maxErrorRate ?? 0.05;
  const minCompletionRate = input.minCompletionRate ?? 0.95;
  const reasons: string[] = [];
  if (input.errorRate > maxErrorRate) reasons.push('error-rate-above-threshold');
  if (input.completionRate < minCompletionRate) reasons.push('completion-rate-below-threshold');
  const decision = reasons.length >= 2 ? 'rollback' : reasons.length ? 'pause' : 'continue';
  return {
    channel: input.channel,
    version: input.version,
    errorRate: input.errorRate,
    completionRate: input.completionRate,
    healthy: reasons.length === 0,
    decision,
    reasons,
  };
}
