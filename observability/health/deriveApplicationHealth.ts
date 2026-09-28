import type { ApplicationHealth } from './ApplicationHealth';
export function deriveApplicationHealth(input: { criticalIssueCodes: readonly string[]; warningIssueCodes: readonly string[]; activeErrorCode: string | null }): ApplicationHealth {
  if (input.criticalIssueCodes.length) return { level: 'critical', summary: 'The extension detected a critical runtime problem.', issueCodes: input.criticalIssueCodes, updatedAt: Date.now() };
  const issueCodes = [...input.warningIssueCodes, ...(input.activeErrorCode ? [input.activeErrorCode] : [])];
  if (issueCodes.length) return { level: 'degraded', summary: 'The extension is operating with limited reliability.', issueCodes, updatedAt: Date.now() };
  return { level: 'healthy', summary: 'The extension is operating normally.', issueCodes: [], updatedAt: Date.now() };
}
