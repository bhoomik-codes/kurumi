/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: 'dev.kurumi.ai',
  productName: 'KURUMI',
  directories: {
    output: 'dist',
  },
  files: ['dist-electron/**/*', 'dist/**/*', 'package.json'],
  // Native addons and the utility-process bundle must load from disk outside ASAR.
  asar: true,
  asarUnpack: [
    '**/dist-electron/worker.js',
    '**/node_modules/@lancedb/lancedb/**/*',
    '**/node_modules/better-sqlite3/**/*',
    '**/node_modules/onnxruntime-node/**/*',
    '**/node_modules/sharp/**/*',
    '**/*.node',
  ],
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico',
    artifactName: 'KURUMI-Setup-${version}.exe',
  },
  mac: {
    target: 'dmg',
    icon: 'assets/icon.icns',
    category: 'public.app-category.productivity',
    hardenedRuntime: true,
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'assets/icon.png',
    category: 'Utility',
  },
  extraResources: [{ from: 'resources/', to: '.' }],
}
