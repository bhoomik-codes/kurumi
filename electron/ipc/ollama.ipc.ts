import { ipcMain } from 'electron'
import { ollamaService } from '../services/OllamaService'

export function registerOllamaIpc() {
  ipcMain.handle('ollama:status', async () => {
    return await ollamaService.checkStatus()
  })

  ipcMain.handle('ollama:models', async () => {
    return await ollamaService.getModels()
  })

  // We use standard event messaging for streaming, not handle.
  ipcMain.on('ollama:chat:stream', async (event, args) => {
    const { messages, model, options, replyId } = args
    
    try {
      const stream = ollamaService.streamChat(messages, model, options)
      
      for await (const chunk of stream) {
        if (event.sender.isDestroyed()) {
          ollamaService.abortCurrentStream()
          break
        }
        
        event.sender.send(`ollama:chat:chunk:${replyId}`, chunk)
        
        if (chunk.done) {
          event.sender.send(`ollama:chat:done:${replyId}`, chunk)
        }
      }
    } catch (error: any) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`ollama:chat:error:${replyId}`, error.message)
      }
    }
  })

  ipcMain.on('ollama:chat:abort', () => {
    ollamaService.abortCurrentStream()
  })
}
