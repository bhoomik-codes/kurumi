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
      'react-devtools-core', // Optional ink devtools, not needed at runtime
      'yoga-layout-prebuilt'
    ],
    format: 'cjs'
  });

  console.log('Packaging with @yao-pkg/pkg...');
  
  // Copy airllm_server.py to dist so pkg can find it relative to cli.js
  if (fs.existsSync('airllm_server.py')) {
    fs.copyFileSync('airllm_server.py', 'dist/airllm_server.py');
  }

  try {
    execSync('npx pkg package.json -t node20-linux-x64 --out-path dist', { stdio: 'inherit' });
    console.log('Packaging complete!');
    // rename to kurumi-cli
    if (fs.existsSync('dist/kurumi')) {
      fs.renameSync('dist/kurumi', 'dist/kurumi-cli');
    } else if (fs.existsSync('dist/cli')) {
      fs.renameSync('dist/cli', 'dist/kurumi-cli');
    }
  } catch (e) {
    console.error('Packaging failed', e);
    process.exit(1);
  }
}

build();
