const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const bsqPath = path.resolve('node_modules/better-sqlite3');
const buildRel = path.join(bsqPath, 'build', 'Release', 'better_sqlite3.node');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env }, ...opts });
}

// Ensure clean state
run('npm install better-sqlite3 --ignore-scripts --legacy-peer-deps');

// 1. Build for Node
console.log('Building for Node...');
// Use bundled npm node-gyp to avoid @electron/node-gyp shadowing
const systemNodeGyp = '/usr/lib/node_modules_22/npm/node_modules/node-gyp/bin/node-gyp.js';
if (fs.existsSync(systemNodeGyp)) {
    run(`node ${systemNodeGyp} rebuild --release`, { cwd: bsqPath });
} else {
    run(`npm rebuild better-sqlite3 --build-from-source`);
}

const nodeVer = process.versions.node;
const nodeDir = path.join(bsqPath, 'compiled', nodeVer, process.platform, process.arch);
fs.mkdirSync(nodeDir, { recursive: true });
fs.copyFileSync(buildRel, path.join(nodeDir, 'better_sqlite3.node'));

// 2. Build for Electron
console.log('Building for Electron...');
run('npx electron-rebuild -f -w better-sqlite3');

const electronNodeVer = '20.18.0'; // target electron's node version
const electronDir = path.join(bsqPath, 'compiled', electronNodeVer, process.platform, process.arch);
fs.mkdirSync(electronDir, { recursive: true });
fs.copyFileSync(buildRel, path.join(electronDir, 'better_sqlite3.node'));

console.log('Cleaning up build directory so bindings.js falls through to compiled directories...');
fs.rmSync(path.join(bsqPath, 'build'), { recursive: true, force: true });

console.log('Done!');
