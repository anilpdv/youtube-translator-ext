import { performance } from 'node:perf_hooks';

const startedAt = performance.now();
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  suite: 'performance-smoke',
  budgets: {
    'caption.parse.duration_ms': 250,
    'caption.validate.duration_ms': 150,
    'translation.plan.duration_ms': 150,
    'rendering.cue_lookup.duration_ms': 1,
    'popup.state_load.duration_ms': 300,
  },
  durationMs: Number((performance.now() - startedAt).toFixed(2)),
};
console.log(JSON.stringify(report, null, 2));
