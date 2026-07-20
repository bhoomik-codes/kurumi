import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: [
              '@lancedb/lancedb',
              'better-sqlite3',
              'electron-store',
              'ollama',
              'onnxruntime-node',
              'sharp',
              'pdf-parse',
            ],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
        onstart(options) {
          options.reload()
        },
      },
      {
        entry: 'electron/worker/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                entryFileNames: 'worker.js',
              },
              external: [
                '@lancedb/lancedb',
                'better-sqlite3',
                'electron-store',
                'ollama',
                'onnxruntime-node',
                'sharp',
                'pdf-parse',
              ],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
  },
  test: {
    // CLI and daemon tests use Node built-ins (fs, path, child_process) and must NOT
    // run through vite-plugin-electron-renderer's browser shims. Use environment
    // overrides to ensure they get a real Node environment.
    environmentMatchGlobs: [
      // Electron IPC and renderer tests → jsdom (default Vite behavior)
      ['electron/**/*.test.{ts,tsx}', 'node'],
      ['dist-electron/**/*.test.{js,ts}', 'node'],
      // CLI / daemon / TUI tests → pure Node
      ['src/cli/**/*.test.{ts,tsx}', 'node'],
      ['src/daemon/**/*.test.{ts,tsx}', 'node'],
    ],
  },
})
