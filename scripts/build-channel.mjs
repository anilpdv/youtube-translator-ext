import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const channel = process.argv[2];
if (!['development', 'beta', 'stable'].includes(channel)) throw new Error('Channel must be development, beta, or stable.');
const version = process.env.RELEASE_VERSION ?? JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
execFileSync('npx', ['wxt', 'build'], { stdio: 'inherit', env: { ...process.env, RELEASE_CHANNEL: channel, RELEASE_VERSION: version } });
fs.writeFileSync('.output/release-metadata.json', JSON.stringify({
  version, channel, commitHash: process.env.GITHUB_SHA ?? 'local',
  buildId: `${version}-${channel}-${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)}`,
  builtAt: Date.now(), schemaVersions: { settings: 1, cache: 1, diagnostics: 1, messageProtocol: 1 },
  enabledFeatures: channel === 'stable'
    ? ['popupWorkflow', 'standardCaptionExtraction', 'translationCache', 'translatedSrtExport', 'diagnosticsExport']
    : [],
}, null, 2));
