const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(m?js|cjs)$/.test(file)) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status) { console.error(result.stderr); process.exit(1); }
      count++;
    } else if (file.endsWith('.json')) JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  }
}
for (const dir of ['public', 'server', 'tests']) walk(path.join(root, dir));
const result = spawnSync(process.execPath, ['--check', path.join(root, 'server.js')], { encoding: 'utf8' });
if (result.status) { console.error(result.stderr); process.exit(1); }
console.log(`Syntax and JSON OK: ${count + 1} JavaScript files.`);
