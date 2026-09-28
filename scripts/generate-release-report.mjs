import fs from 'node:fs';
const metadataPath = process.argv[2] ?? '.output/release-metadata.json';
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
console.log(`# Release report\n\n- Version: ${metadata.version}\n- Channel: ${metadata.channel}\n- Build ID: ${metadata.buildId}\n- Commit: ${metadata.commitHash}\n- Built at: ${new Date(metadata.builtAt).toISOString()}\n`);
