import { ipcMain } from 'electron'

import dotenv from 'dotenv';
dotenv.config();
const DAEMON_URL = `http://${process.env.KURUMI_DAEMON_HOST || '127.0.0.1'}:${process.env.KURUMI_DAEMON_PORT || '47392'}`

export function registerOllamaIpc() {
  ipcMain.handle('ollama:status', async () => {
    try {
      const res = await fetch(`${DAEMON_URL}/health`)
      return res.ok
    } catch {
      return false
    }
  })

  ipcMain.handle('ollama:models', async () => {
    try {
      const res = await fetch(`${DAEMON_URL}/models`)
      const data = await res.json()
      return data.ollama || []
    } catch {
      return []
    }
  })

  ipcMain.handle('ollama:warmup', async (_event, modelName: string) => {
    try {
      const res = await fetch(`${DAEMON_URL}/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ollama', model: modelName })
      })
      const data = await res.json()
      return data.ok
    } catch {
      return false
    }
  })

  ipcMain.handle('ollama:warmup:abort', async () => {
    // Daemon warmup doesn't support abort currently, just mock it
    return true
  })

  ipcMain.handle('ollama:ps', async () => {
    // not strictly necessary to proxy since we proxy chat, but could proxy if needed
    return null
  })

  let activeChatAborts = new Map<string, AbortController>()

  ipcMain.on('ollama:chat:stream', async (event, args) => {
    const { messages, model, options, replyId } = args
    
    const ac = new AbortController()
    activeChatAborts.set(replyId, ac)

    try {
      const response = await fetch(`${DAEMON_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ollama', model, messages, options }),
        signal: ac.signal
      })

      if (!response.ok || !response.body) throw new Error('HTTP ' + response.status)

      // STREAMING PASSTHROUGH CHECK: Piping SSE chunks incrementally to Electron renderer
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (event.sender.isDestroyed()) {
          ac.abort()
          break
        }
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(Boolean)
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '')
            try {
              const data = JSON.parse(dataStr)
              if (data.error) throw new Error(data.error)
              
              event.sender.send(`ollama:chat:chunk:${replyId}`, data)
              if (data.done) {
                event.sender.send(`ollama:chat:done:${replyId}`, data)
              }
            } catch (e) {
              // skip parse errors
            }
          }
        }
      }
    } catch (error: any) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`ollama:chat:error:${replyId}`, error.message)
      }
    } finally {
      activeChatAborts.delete(replyId)
    }
  })

  ipcMain.on('ollama:pull:start', async (event, modelName: string) => {
    try {
      const response = await fetch(`${DAEMON_URL}/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      })

      if (!response.ok || !response.body) throw new Error('Pull failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (event.sender.isDestroyed()) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(Boolean)
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.replace('data: ', ''))
            const percent = data.total && data.completed
              ? Math.round((data.completed / data.total) * 100)
              : null
            event.sender.send('ollama:pull:progress', {
              status: data.status,
              percent,
              total: data.total,
              completed: data.completed,
            })
          }
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
    const response = await fetch(`${DAEMON_URL}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'ollama', model: modelName })
    })
    const data = await response.json()
    if (!data.ok) throw new Error(data.error)
    return true
  })

  ipcMain.on('ollama:chat:abort', (event, replyId) => {
    // Only abort the specific stream in this process
    if (replyId && activeChatAborts.has(replyId)) {
      activeChatAborts.get(replyId)?.abort()
      activeChatAborts.delete(replyId)
    }
  })
}