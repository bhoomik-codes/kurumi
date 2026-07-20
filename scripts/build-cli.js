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
    target: 'node22',
    outfile: 'dist/cli.js',
    external: [
      'better-sqlite3',
      '@lancedb/lancedb',
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

  // Native .node binaries cannot be loaded from inside a pkg snapshot — they must
  // sit on the real filesystem next to the executable. Copy the Node 22 binary.
  const sqliteNode = 'node_modules/better-sqlite3/compiled/22.22.2/linux/x64/better_sqlite3.node';
  const sqliteNodeFallback = 'node_modules/better-sqlite3/build/Release/better_sqlite3.node';
  const sqliteSrc = fs.existsSync(sqliteNode) ? sqliteNode : sqliteNodeFallback;
  if (fs.existsSync(sqliteSrc)) {
    fs.mkdirSync('dist/better-sqlite3/build/Release', { recursive: true });
    fs.copyFileSync(sqliteSrc, 'dist/better-sqlite3/build/Release/better_sqlite3.node');
    console.log(`Copied ${sqliteSrc} → dist/better-sqlite3/build/Release/better_sqlite3.node`);
  } else {
    console.warn('WARNING: Could not find better-sqlite3.node — daemon will fail to load SQLite');
  }

  try {
    execSync('npx pkg package.json -t node22-linux-x64 --out-path dist', { stdio: 'inherit' });
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
