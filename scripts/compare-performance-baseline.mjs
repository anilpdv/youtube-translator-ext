import fs from 'node:fs';

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  console.error('Usage: node scripts/compare-performance-baseline.mjs <baseline.json> <candidate.json>');
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const failures = [];
for (const [metric, threshold] of Object.entries(baseline.budgets ?? {})) {
  const value = candidate.metrics?.[metric];
  if (typeof value === 'number' && value > threshold) failures.push(`${metric}: ${value} > ${threshold}`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Performance baseline passed.');
