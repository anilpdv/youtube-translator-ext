import fs from 'node:fs';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/generate-performance-report.mjs <result.json>');
  process.exit(1);
}
const result = JSON.parse(fs.readFileSync(input, 'utf8'));
console.log(`# Performance report\n\nGenerated: ${result.generatedAt}\n\n- Suite: ${result.suite}\n- Duration: ${result.durationMs}ms\n- Status: qualified when all configured budgets pass.\n`);
