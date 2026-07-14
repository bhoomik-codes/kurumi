// airllm.ipc.ts — IPC handlers for the local AirLLM streaming server.
// Mirrors the structure of nvidia.ipc.ts exactly so Chat.tsx can use
// the same event-based streaming pattern.

import { ipcMain } from 'electron'
import { airllmService } from '../services/AirLLMService'

export function registerAirLLMIpc() {
  // ── Health check ────────────────────────────────────────────────────────────
  ipcMain.handle('airllm:status', async () => {
    return await airllmService.checkStatus()
  })

  // ── Model list ───────────────────────────────────────────────────────────────
  ipcMain.handle('airllm:models', async () => {
    return await airllmService.getModels()
  })

  // ── Streaming chat ───────────────────────────────────────────────────────────
  ipcMain.on('airllm:chat:stream', async (event, args: {
    messages: { role: string; content: string }[]
    model: string
    replyId: string
    options?: { max_tokens?: number; temperature?: number; top_p?: number }
  }) => {
    const { messages, model, replyId, options } = args
    console.log(`[AirLLM IPC] Stream request — model: ${model}, replyId: ${replyId}`)

    try {
      const stream = airllmService.streamChat(messages, model, options ?? {})
      let chunksSent = 0

      for await (const chunk of stream) {
        if (event.sender.isDestroyed()) {
          console.warn('[AirLLM IPC] Renderer destroyed, aborting stream')
          airllmService.abort()
          break
        }

        if (chunk.done) {
          console.log(`[AirLLM IPC] Stream complete — ${chunksSent} content chunks sent`)
          event.sender.send(`airllm:chat:done:${replyId}`, chunk)
          break
        }

        if (chunk.content) {
          chunksSent++
          event.sender.send(`airllm:chat:chunk:${replyId}`, chunk)
        }
      }
    } catch (error: any) {
      console.error('[AirLLM IPC] Stream error:', error.message)
      if (!event.sender.isDestroyed()) {
        event.sender.send(`airllm:chat:error:${replyId}`, error.message)
      }
    }
  })

  // ── Abort ────────────────────────────────────────────────────────────────────
  ipcMain.on('airllm:chat:abort', () => {
    console.log('[AirLLM IPC] Abort requested')
    airllmService.abort()
  })
}
