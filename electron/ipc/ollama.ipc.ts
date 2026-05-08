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

  ipcMain.handle('ollama:pull', async (event, modelName: string) => {
    const response = await fetch(`${ollamaService.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false })
    })
    if (!response.ok) throw new Error(`Pull failed: ${response.statusText}`)
    return await response.json()
  })

  ipcMain.handle('ollama:delete', async (event, modelName: string) => {
    const response = await fetch(`${ollamaService.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    })
    if (!response.ok) throw new Error(`Delete failed: ${response.statusText}`)
    return true
  })

  ipcMain.on('ollama:chat:abort', () => {
    ollamaService.abortCurrentStream()
  })
}

