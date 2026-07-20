import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { registerSqliteIpc } from './ipc/sqlite.ipc'
import { registerOllamaIpc } from './ipc/ollama.ipc'
import { registerStoreIpc } from './ipc/store.ipc'
import { registerRagIpc } from './ipc/rag.ipc'
import { registerSystemIpc } from './ipc/system.ipc'
import { registerNvidiaIpc } from './ipc/nvidia.ipc'
import { registerAirLLMIpc } from './ipc/airllm.ipc'
import { registerImageGenIpc } from './ipc/imagegen.ipc'
import { registerVoiceIpc } from './ipc/voice.ipc'
import { spawn } from 'child_process'
import path from 'path'

import dotenv from 'dotenv';
dotenv.config();
const DAEMON_URL = `http://${process.env.KURUMI_DAEMON_HOST || '127.0.0.1'}:${process.env.KURUMI_DAEMON_PORT || '47392'}`

async function checkDaemonHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(1000) })
    return res.ok
  } catch {
    return false
  }
}

async function ensureDaemon(): Promise<void> {
  const isHealthy = await checkDaemonHealth()
  if (isHealthy) return

  console.log('[main] Starting background daemon (kurumid)...')
  
  // Use tsx for dev, or compiled server for prod. We assume tsx for now.
  const daemonScript = path.join(__dirname, '..', 'src', 'daemon', 'server.ts')
  const child = spawn('npx', ['tsx', daemonScript], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  
  child.stderr.on('data', (data) => {
    console.error(`[Daemon STDERR]: ${data.toString()}`)
  })
  child.stdout.on('data', (data) => {
    console.log(`[Daemon STDOUT]: ${data.toString()}`)
  })
  
  child.unref()

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500))
    if (await checkDaemonHealth()) return
  }
  console.error('[main] Daemon failed to start.')
}

/** Linux containers: Chromium shared memory + sandbox flags (see Docker README). */
if (process.env.KURUMI_DOCKER === '1') {
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  app.commandLine.appendSwitch('no-sandbox')
}

// Fix for black screen / VSync issues (gl_surface_presentation_helper.cc errors)
app.disableHardwareAcceleration()

let signalShutdownStarted = false
function shutdownFromOsSignal(signal: string): void {
  if (!signalShutdownStarted) {
    signalShutdownStarted = true
    console.log(`[main] ${signal} received, quitting`)
  }
  app.quit()
}
process.on('SIGTERM', () => shutdownFromOsSignal('SIGTERM'))
process.on('SIGINT', () => shutdownFromOsSignal('SIGINT'))

// Set app user model id for windows
app.setAppUserModelId('dev.kurumi.ai')

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    frame: false,
    titleBarStyle: 'hidden',
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined,
    backgroundColor: '#050305',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for better-sqlite3 in some setups, but here we run sqlite in main
    },
  })

  // CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !!process.env.VITE_DEV_SERVER_URL
    // blob: is required for Web Audio API TTS playback (AudioContext + createObjectURL)
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws:; script-src 'self' 'unsafe-eval' 'unsafe-inline' http:; connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* https://integrate.api.nvidia.com; media-src 'self' blob: data:;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://integrate.api.nvidia.com http://127.0.0.1:8765; media-src 'self' blob: data:;"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // Open devtools in dev
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Screenshot logic for artifact capture
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        if (!mainWindow) return
        const image = await mainWindow.webContents.capturePage()
        require('fs').writeFileSync('/home/bixpurr/.gemini/antigravity-ide/brain/36b57f31-e440-40cc-83af-0c9336c41500/kurumi_gui_screenshot.png', image.toPNG())
        console.log('Saved screenshot artifact!')
      } catch (e) {
        console.error('Failed to save screenshot:', e)
      }
    }, 2000)
  })
}

// App lifecycle
app.whenReady().then(async () => {
  console.log(`Main process ready userData=${app.getPath('userData')} packaged=${app.isPackaged}`)

  await ensureDaemon()

  createWindow()
  registerSqliteIpc()
  registerOllamaIpc()
  registerStoreIpc()
  registerRagIpc()
  registerSystemIpc()
  registerNvidiaIpc()
  registerAirLLMIpc()
  registerImageGenIpc()
  registerVoiceIpc()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

let ragWorkerQuitHandled = false
app.on('before-quit', (event) => {
  if (ragWorkerQuitHandled) return
  ragWorkerQuitHandled = true
  // The daemon is detached and will persist (or we could fetch('/shutdown') if we wanted)
  app.quit()
})

// Basic window controls IPC
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())


