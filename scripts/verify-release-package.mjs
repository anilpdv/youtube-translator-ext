import fs from 'node:fs';
const manifestPath = process.argv[2] ?? '.output/chrome-mv3/manifest.json';
if (!fs.existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.version) throw new Error('Release manifest has no version.');
if (JSON.stringify(manifest).match(/unsafe-eval|sourceMappingURL/)) throw new Error('Release package contains a forbidden development artifact.');
console.log(`Release package verified: ${manifest.name} ${manifest.version}`);
