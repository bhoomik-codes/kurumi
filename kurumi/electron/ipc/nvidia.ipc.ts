import { ipcMain } from 'electron'
import { nvidiaService, NVIDIA_FEATURED_MODELS } from '../services/NvidiaService'

export function registerNvidiaIpc() {
  // ── Validate API key ─────────────────────────────────────────────────────
  ipcMain.handle('nvidia:check', async (_e, apiKey: string) => {
    console.log('[NVIDIA IPC] Checking API key...')
    const result = await nvidiaService.checkKey(apiKey)
    console.log('[NVIDIA IPC] Key check result:', result)
    return result
  })

  // ── List generative models ────────────────────────────────────────────────
  ipcMain.handle('nvidia:models', async (_e, apiKey: string) => {
    if (!apiKey) {
      console.log('[NVIDIA IPC] No API key, returning featured models')
      return NVIDIA_FEATURED_MODELS
    }
    return await nvidiaService.getModels(apiKey)
  })

  // ── Streaming chat ────────────────────────────────────────────────────────
  ipcMain.on('nvidia:chat:stream', async (event, args: {
    messages: { role: string; content: string }[]
    model: string
    apiKey: string
    replyId: string
    options?: { temperature?: number; top_p?: number; max_tokens?: number }
  }) => {
    const { messages, model, apiKey, replyId, options } = args
    console.log(`[NVIDIA IPC] Stream request — model: ${model}, replyId: ${replyId}`)

    if (!apiKey) {
      const errMsg = 'No NVIDIA API key provided. Add one in Settings.'
      console.error('[NVIDIA IPC]', errMsg)
      if (!event.sender.isDestroyed()) {
        event.sender.send(`nvidia:chat:error:${replyId}`, errMsg)
      }
      return
    }

    try {
      const stream = nvidiaService.streamChat(messages, model, apiKey, options ?? {})
      let chunksSent = 0

      for await (const chunk of stream) {
        if (event.sender.isDestroyed()) {
          console.warn('[NVIDIA IPC] Renderer destroyed, aborting stream')
          nvidiaService.abort()
          break
        }

        if (chunk.done) {
          console.log(`[NVIDIA IPC] Stream complete — ${chunksSent} content chunks sent`)
          event.sender.send(`nvidia:chat:done:${replyId}`, chunk)
          break
        }

        if (chunk.content) {
          chunksSent++
          event.sender.send(`nvidia:chat:chunk:${replyId}`, chunk)
        }
      }
    } catch (error: any) {
      console.error('[NVIDIA IPC] Stream error:', error.message)
      if (!event.sender.isDestroyed()) {
        event.sender.send(`nvidia:chat:error:${replyId}`, error.message)
      }
    }
  })

  // ── Abort ─────────────────────────────────────────────────────────────────
  ipcMain.on('nvidia:chat:abort', () => {
    console.log('[NVIDIA IPC] Abort requested')
    nvidiaService.abort()
  })
}
