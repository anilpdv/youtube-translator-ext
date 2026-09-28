import fs from 'node:fs';
const source = process.argv[2] ?? '.output/chrome-mv3';
if (!fs.existsSync(source)) throw new Error(`Build output does not exist: ${source}`);
console.log(`Rollback source verified: ${source}`);
