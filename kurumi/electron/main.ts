import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { registerSqliteIpc } from './ipc/sqlite.ipc'
import { registerOllamaIpc } from './ipc/ollama.ipc'
import { registerStoreIpc } from './ipc/store.ipc'
import { registerRagIpc } from './ipc/rag.ipc'
import { registerSystemIpc } from './ipc/system.ipc'
import { registerNvidiaIpc } from './ipc/nvidia.ipc'
import { registerImageGenIpc } from './ipc/imagegen.ipc'
import { workerManager } from './services/WorkerManager'
import { appendRagWorkerLog } from './services/ragDiagnostics'

/** Linux containers: Chromium shared memory + sandbox flags (see Docker README). */
if (process.env.KURUMI_DOCKER === '1') {
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  app.commandLine.appendSwitch('no-sandbox')
}

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
    const csp = isDev 
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http: https: ws:; script-src 'self' 'unsafe-eval' 'unsafe-inline' http:; connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* https://integrate.api.nvidia.com;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://integrate.api.nvidia.com;"

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
}

// App lifecycle
app.whenReady().then(() => {
  appendRagWorkerLog(
    `Main process ready userData=${app.getPath('userData')} packaged=${app.isPackaged} exec=${process.execPath}`
  )

  createWindow()
  registerSqliteIpc()
  registerOllamaIpc()
  registerStoreIpc()
  registerRagIpc()
  registerSystemIpc()
  registerNvidiaIpc()
  registerImageGenIpc()

  void workerManager.runStartupHealthCheck().then((h) => {
    if (!h.ok) {
      console.error('[RAG] LanceDB / worker health check failed:', h.error)
    }
  })

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
app.on('before-quit', async (event) => {
  if (ragWorkerQuitHandled) return
  event.preventDefault()
  ragWorkerQuitHandled = true
  try {
    await workerManager.shutdown()
  } catch (e) {
    console.error('[RAG worker] shutdown error:', e)
  } finally {
    app.quit()
  }
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


