import { ipcMain } from 'electron'

import dotenv from 'dotenv';
dotenv.config();
const DAEMON_URL = `http://${process.env.KURUMI_DAEMON_HOST || '127.0.0.1'}:${process.env.KURUMI_DAEMON_PORT || '47392'}`

export function registerAirLLMIpc() {
  ipcMain.handle('airllm:status', async () => {
    try {
      const res = await fetch(`${DAEMON_URL}/health`)
      const data = await res.json()
      return data.airllm === 'running' || data.airllm === 'active'
    } catch {
      return false
    }
  })

  ipcMain.handle('airllm:models', async () => {
    try {
      const res = await fetch(`${DAEMON_URL}/models`)
      const data = await res.json()
      return data.airllm || []
    } catch {
      return []
    }
  })

  let activeChatAborts = new Map<string, AbortController>()

  ipcMain.on('airllm:chat:stream', async (event, args) => {
    const { messages, model, options, replyId } = args
    
    const ac = new AbortController()
    activeChatAborts.set(replyId, ac)

    try {
      const response = await fetch(`${DAEMON_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'airllm', model, messages, options }),
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
              
              if (data.content) {
                event.sender.send(`airllm:chat:chunk:${replyId}`, data)
              }
              if (data.done) {
                event.sender.send(`airllm:chat:done:${replyId}`, data)
              }
            } catch (e) {
              // skip parse errors
            }
          }
        }
      }
    } catch (error: any) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`airllm:chat:error:${replyId}`, error.message)
      }
    } finally {
      activeChatAborts.delete(replyId)
    }
  })

  ipcMain.on('airllm:chat:abort', (event, replyId) => {
    if (replyId && activeChatAborts.has(replyId)) {
      activeChatAborts.get(replyId)?.abort()
      activeChatAborts.delete(replyId)
    }
  })
}
