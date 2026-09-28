import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const channel = process.argv[2];
if (!['beta', 'stable'].includes(channel)) throw new Error('Package channel must be beta or stable.');
execFileSync('npx', ['wxt', 'zip'], { stdio: 'inherit', env: { ...process.env, RELEASE_CHANNEL: channel } });
console.log(`Packaged ${channel} release.`);
