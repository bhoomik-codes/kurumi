/**
 * vitest.config.ts — separate from vite.config.ts
 *
 * We intentionally do NOT include vite-plugin-electron or vite-plugin-electron-renderer
 * here. The renderer plugin wraps Node built-ins (fs, path, etc.) with browser-targeted
 * CJS shims that fail in an ESM test context. Tests that run in Node must resolve
 * those modules natively.
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    // All test files run in Node environment (no browser/jsdom needed for unit tests)
    environment: 'node',
    // Make sure __dirname works in test files
    globals: false,
  },
})
