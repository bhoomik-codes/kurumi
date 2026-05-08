import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { registerSqliteIpc } from './ipc/sqlite.ipc'

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
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:"],
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
  createWindow()
  registerSqliteIpc()

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

// Startup Ollama Check mock (To be moved to a service later)
ipcMain.handle('ollama:status', async () => {
  try {
    const res = await fetch('http://localhost:11434/')
    return res.ok
  } catch (e) {
    return false
  }
})
