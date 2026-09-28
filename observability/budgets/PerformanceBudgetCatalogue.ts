import type { PerformanceBudget } from './PerformanceBudget';
export const PERFORMANCE_BUDGETS: readonly PerformanceBudget[] = [
  { metricName: 'caption.parse.duration_ms', threshold: 250, comparison: 'maximum', severity: 'warning', description: 'Caption parsing should remain responsive.' },
  { metricName: 'caption.validate.duration_ms', threshold: 150, comparison: 'maximum', severity: 'warning', description: 'Caption validation should remain bounded.' },
  { metricName: 'translation.plan.duration_ms', threshold: 150, comparison: 'maximum', severity: 'warning', description: 'Translation planning should remain bounded.' },
  { metricName: 'rendering.cue_lookup.duration_ms', threshold: 1, comparison: 'maximum', severity: 'warning', description: 'Cue lookup should remain below one millisecond.' },
  { metricName: 'popup.state_load.duration_ms', threshold: 300, comparison: 'maximum', severity: 'warning', description: 'Popup state should load quickly.' },
  { metricName: 'rendering.active_overlays', threshold: 1, comparison: 'maximum', severity: 'critical', description: 'Only one subtitle overlay may exist.' },
];
