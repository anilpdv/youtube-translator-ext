import fs from 'node:fs';
const manifestPath = process.argv[2] ?? '.output/chrome-mv3/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const forbidden = new Set(['debugger', 'unlimitedStorage']);
const violations = (manifest.permissions ?? []).filter((permission) => forbidden.has(permission));
if (violations.length) throw new Error(`Forbidden permissions: ${violations.join(', ')}`);
console.log('Manifest permissions verified.');
