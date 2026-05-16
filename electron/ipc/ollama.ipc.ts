import { ipcMain } from 'electron'
import { ollamaService } from '../services/OllamaService'

export function registerOllamaIpc() {
  ipcMain.handle('ollama:status', async () => {
    return await ollamaService.checkStatus()
  })

  ipcMain.handle('ollama:models', async () => {
    return await ollamaService.getModels()
  })

  ipcMain.handle('ollama:warmup', async (_event, modelName: string) => {
    return await ollamaService.warmup(modelName)
  })

  ipcMain.handle('ollama:warmup:abort', async () => {
    ollamaService.abortWarmup()
    return true
  })

  ipcMain.handle('ollama:ps', async () => {
    try {
      const response = await fetch(`${ollamaService.baseUrl}/api/ps`)
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  })

  // We use standard event messaging for streaming, not handle.
  ipcMain.on('ollama:chat:stream', async (event, args) => {
    const { messages, model, options, replyId } = args
    ollamaService.abortWarmup()

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

  ipcMain.on('ollama:pull:start', async (event, modelName: string) => {
    try {
      const response = await fetch(`${ollamaService.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true })
      })

      if (!response.ok || !response.body) {
        event.sender.send('ollama:pull:error', `HTTP ${response.status}: ${response.statusText}`)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (event.sender.isDestroyed()) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            // data: { status, digest, total, completed }
            const percent = data.total && data.completed
              ? Math.round((data.completed / data.total) * 100)
              : null
            event.sender.send('ollama:pull:progress', {
              status: data.status,
              percent,
              total: data.total,
              completed: data.completed,
            })
          } catch { /* skip malformed lines */ }
        }
      }

      event.sender.send('ollama:pull:done')
    } catch (err: any) {
      if (!event.sender.isDestroyed()) {
        event.sender.send('ollama:pull:error', err.message)
      }
    }
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