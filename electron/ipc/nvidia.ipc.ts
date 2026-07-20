import { ipcMain } from 'electron'

import dotenv from 'dotenv';
dotenv.config();
const DAEMON_URL = `http://${process.env.KURUMI_DAEMON_HOST || '127.0.0.1'}:${process.env.KURUMI_DAEMON_PORT || '47392'}`

export const NVIDIA_FEATURED_MODELS = [
  { id: 'meta/llama-3.1-8b-instruct',              label: 'Llama 3.1 8B Instruct',   tag: 'Meta (Cloud)'     },
  { id: 'meta/llama-3.3-70b-instruct',             label: 'Llama 3.3 70B Instruct',  tag: 'Meta (Cloud)'     },
  { id: 'meta/llama-3.1-405b-instruct',            label: 'Llama 3.1 405B Instruct', tag: 'Meta (Cloud)'     },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1',  label: 'Nemotron Super 49B',       tag: 'NVIDIA (Cloud)'   },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', label: 'Nemotron Ultra 253B',      tag: 'NVIDIA (Cloud)'   },
  { id: 'google/gemma-3-27b-it',                   label: 'Gemma 3 27B',              tag: 'Google (Cloud)'   },
  { id: 'google/gemma-3-12b-it',                   label: 'Gemma 3 12B',              tag: 'Google (Cloud)'   },
  { id: 'ai21labs/jamba-1.5-large-instruct',       label: 'Jamba 1.5 Large',          tag: 'AI21 (Cloud)'     },
  { id: 'databricks/dbrx-instruct',                label: 'DBRX Instruct',            tag: 'Databricks(Cloud)'},
  { id: 'bytedance/seed-oss-36b-instruct',         label: 'Seed OSS 36B',             tag: 'ByteDance(Cloud)' },
]

export function registerNvidiaIpc() {
  ipcMain.handle('nvidia:check', async (_e, apiKey: string) => {
    try {
      const res = await fetch(`${DAEMON_URL}/nvidia/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      })
      return await res.json()
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('nvidia:models', async (_e, apiKey: string) => {
    if (!apiKey) {
      return NVIDIA_FEATURED_MODELS
    }
    try {
      const res = await fetch(`${DAEMON_URL}/models?nvidiaApiKey=${apiKey}`)
      const data = await res.json()
      // Tag models with (Cloud) to ensure users know it requires connectivity
      return (data.nvidia || []).map((m: any) => ({
        ...m,
        tag: m.tag.includes('Cloud') ? m.tag : `${m.tag} (Cloud)`
      }))
    } catch {
      return NVIDIA_FEATURED_MODELS
    }
  })

  let activeChatAborts = new Map<string, AbortController>()

  ipcMain.on('nvidia:chat:stream', async (event, args) => {
    const { messages, model, apiKey, replyId, options } = args
    
    if (!apiKey) {
      const errMsg = 'No NVIDIA API key provided. Add one in Settings.'
      if (!event.sender.isDestroyed()) {
        event.sender.send(`nvidia:chat:error:${replyId}`, errMsg)
      }
      return
    }

    const ac = new AbortController()
    activeChatAborts.set(replyId, ac)

    try {
      const response = await fetch(`${DAEMON_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'nvidia', model, messages, apiKey, options }),
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
            let data: any
            try {
              data = JSON.parse(dataStr)
            } catch (e) {
              continue // skip parse errors
            }
            
            if (data.error) throw new Error(data.error)
            
            if (data.content !== undefined) { // NVIDIA may send empty content for start chunk
              event.sender.send(`nvidia:chat:chunk:${replyId}`, data)
            }
            if (data.done) {
              event.sender.send(`nvidia:chat:done:${replyId}`, data)
            }
          }
        }
      }
    } catch (error: any) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`nvidia:chat:error:${replyId}`, error.message)
      }
    } finally {
      activeChatAborts.delete(replyId)
    }
  })

  ipcMain.on('nvidia:chat:abort', (event, replyId) => {
    if (replyId && activeChatAborts.has(replyId)) {
      activeChatAborts.get(replyId)?.abort()
      activeChatAborts.delete(replyId)
    }
  })
}
