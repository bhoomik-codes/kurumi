import { ipcMain } from 'electron'
import { nvidiaService, NVIDIA_FEATURED_MODELS } from '../services/NvidiaService'

export function registerNvidiaIpc() {
  // Validate API key
  ipcMain.handle('nvidia:check', async (_e, apiKey: string) => {
    return await nvidiaService.checkKey(apiKey)
  })

  // List generative models
  ipcMain.handle('nvidia:models', async (_e, apiKey: string) => {
    if (!apiKey) return NVIDIA_FEATURED_MODELS
    return await nvidiaService.getModels(apiKey)
  })

  // Streaming chat — mirrors ollama:chat:stream interface for easy frontend swap
  ipcMain.on('nvidia:chat:stream', async (event, args: {
    messages: { role: string; content: string }[]
    model: string
    apiKey: string
    replyId: string
    options?: { temperature?: number; top_p?: number; max_tokens?: number }
  }) => {
    const { messages, model, apiKey, replyId, options } = args

    try {
      const stream = nvidiaService.streamChat(messages, model, apiKey, options ?? {})

      for await (const chunk of stream) {
        if (event.sender.isDestroyed()) {
          nvidiaService.abort()
          break
        }
        event.sender.send(`nvidia:chat:chunk:${replyId}`, chunk)
        if (chunk.done) {
          event.sender.send(`nvidia:chat:done:${replyId}`, chunk)
        }
      }
    } catch (error: any) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`nvidia:chat:error:${replyId}`, error.message)
      }
    }
  })

  ipcMain.on('nvidia:chat:abort', () => {
    nvidiaService.abort()
  })
}
