import type { ResourceSnapshot } from './ResourceSnapshot';
export interface ResourceHealthIssue { readonly code: string; readonly severity: 'warning' | 'critical'; readonly message: string; }
export class ResourceHealthMonitor {
  evaluate(snapshot: ResourceSnapshot): readonly ResourceHealthIssue[] {
    const issues: ResourceHealthIssue[] = [];
    if (snapshot.activeOverlays > 1) issues.push({ code: 'DUPLICATE_OVERLAY', severity: 'critical', message: 'More than one subtitle overlay is active.' });
    if (snapshot.activeSchedulers > 1) issues.push({ code: 'DUPLICATE_SCHEDULER', severity: 'critical', message: 'More than one subtitle scheduler is active.' });
    if (snapshot.activeProviderRequests > 2) issues.push({ code: 'PROVIDER_CONCURRENCY_EXCEEDED', severity: 'critical', message: 'Provider request concurrency exceeded its expected limit.' });
    if (snapshot.pendingCacheWrites > 20) issues.push({ code: 'CACHE_WRITE_BACKLOG', severity: 'warning', message: 'Translation cache writes are backing up.' });
    return issues;
  }
}
