const esbuild = require('esbuild');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

async function build() {
  console.log('Bundling with esbuild...');
  await esbuild.build({
    entryPoints: ['src/cli/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/cli.js',
    external: [
      'better-sqlite3',
      'electron',
      'ink', // Ink requires native modules / react stuff that is tricky to bundle, but pkg supports requiring it if included
    ],
    format: 'cjs'
  });

  console.log('Packaging with @yao-pkg/pkg...');
  // We need to create a simple package.json for pkg to read assets, or pass them directly
  // We'll configure pkg in package.json directly
  
  try {
    execSync('npx pkg dist/cli.js -t node20-linux-x64,node20-win-x64 --out-path dist', { stdio: 'inherit' });
    console.log('Packaging complete!');
    // rename to kurumi-cli
    if (fs.existsSync('dist/cli')) {
      fs.renameSync('dist/cli', 'dist/kurumi-cli');
    }
  } catch (e) {
    console.error('Packaging failed', e);
    process.exit(1);
  }
}

build();
