/**
 * Phase 9 — Cursed Speech: Voice IPC bridge.
 *
 * voice:transcribe — Receives raw 16kHz Float32 PCM as a plain number[] from
 *                    the renderer (structured-clone safe), dispatches it to the
 *                    UtilityProcess for Whisper inference, and returns the
 *                    transcript text.
 *
 * No native audio capture modules are needed — mic access happens entirely in
 * the renderer via the Web MediaDevices API, which keeps ASAR unpacking simple.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { workerManager } from '../services/WorkerManager'

export function registerVoiceIpc() {
  // ── Transcription (STT) ─────────────────────────────────────────────────────
  ipcMain.handle(
    'voice:transcribe',
    async (
      _,
      payload: {
        pcmData: number[]
        modelSize?: 'tiny' | 'base' | 'small'
        language?: string
      }
    ) => {
      try {
        const result = await workerManager.transcribeAudio(
          payload.pcmData,
          payload.modelSize ?? 'base',
          payload.language ?? 'english'
        )
        return { ok: true, text: result.text }
      } catch (err: any) {
        console.error('[voice IPC] transcription error:', err)
        return { ok: false, error: err?.message ?? String(err) }
      }
    }
  )

  // ── Worker status helper ────────────────────────────────────────────────────
  // The renderer can ping this to know if the worker is ready before recording.
  ipcMain.handle('voice:worker-ready', async () => {
    try {
      await workerManager.ensureWorker()
      return { ready: true }
    } catch (err: any) {
      return { ready: false, error: err?.message ?? String(err) }
    }
  })

  // ── Broadcast transcription chunk to all windows ────────────────────────────
  // Used by any future streaming implementation or secondary windows.
  ipcMain.on('voice:broadcast-chunk', (_, text: string) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('voice:transcription-chunk', text)
    }
  })
}
