export type ApplicationHealthLevel = 'healthy' | 'degraded' | 'critical';
export interface ApplicationHealth { readonly level: ApplicationHealthLevel; readonly summary: string; readonly issueCodes: readonly string[]; readonly updatedAt: number; }
