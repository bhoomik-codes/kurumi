import fastify from 'fastify'
import cors from '@fastify/cors'
import { logger } from './logger'
import { dbService } from './db'
import { getProcessStatus, startSupervisedProcess, ensureOllama } from './supervisor'
import { ollamaService } from './services/OllamaService'
import { airllmService } from './services/AirLLMService'
import { nvidiaService } from './services/NvidiaService'
import { workerManager } from './workerManager'

const app = fastify({ logger: false }) // We use our own winston logger

app.register(cors, {
  origin: true
})

app.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    airllm: getProcessStatus('airllm'),
    // ollama is typically managed by the system, we can ping it
    timestamp: Date.now()
  }
})

app.get('/models', async (request, reply) => {
  const query = request.query as { nvidiaApiKey?: string }
  const ollama = await ollamaService.getModels()
  const airllm = await airllmService.getModels()
  const nvidia = await nvidiaService.getModels(query.nvidiaApiKey || '')
  return {
    ollama,
    airllm,
    nvidia
  }
})

app.post('/nvidia/check', async (request, reply) => {
  const { apiKey } = request.body as { apiKey: string }
  return nvidiaService.checkKey(apiKey)
})

app.get('/history', async (request, reply) => {
  const history = dbService.all('SELECT * FROM conversations ORDER BY updated_at DESC')
  return { history }
})

app.get('/threads/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const thread = dbService.get('SELECT * FROM conversations WHERE id = ?', [id])
  const messages = dbService.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [id])
  return { thread, messages }
})

app.post('/chat', async (request, reply) => {
  const { provider, model, messages, options, apiKey } = request.body as any
  
  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')
  reply.raw.flushHeaders()

  try {
    let stream;
    if (provider === 'airllm') {
      stream = airllmService.streamChat(messages, model, options)
    } else if (provider === 'nvidia') {
      stream = nvidiaService.streamChat(messages, model, apiKey || '', options)
    } else {
      stream = ollamaService.streamChat(messages, model, options)
    }

    for await (const chunk of stream) {
      if (chunk.content) {
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
      if (chunk.done) {
        reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`)
      }
    }
  } catch (err: any) {
    logger.error('Chat error', { error: err.message })
    reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  } finally {
    reply.raw.end()
  }
})

// Management endpoints
app.post('/warmup', async (request, reply) => {
  const { provider, model } = request.body as any
  try {
    if (provider === 'airllm') {
      const ok = await airllmService.warmup(model)
      return { ok }
    } else {
      const ok = await ollamaService.warmup(model)
      return { ok }
    }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
})

app.post('/delete', async (request, reply) => {
  const { provider, model } = request.body as any
  try {
    if (provider === 'ollama') {
      const res = await fetch(`http://127.0.0.1:11434/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model })
      })
      if (!res.ok) throw new Error(res.statusText)
      return { ok: true }
    }
    return { ok: false, error: 'Not supported for provider' }
  } catch (err: any) {
    reply.status(500).send({ error: err.message })
  }
})

app.post('/pull', async (request, reply) => {
  const { model } = request.body as any
  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')
  reply.raw.flushHeaders()

  try {
    const res = await fetch(`http://127.0.0.1:11434/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true })
    })
    
    if (!res.ok || !res.body) throw new Error(res.statusText)
    
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(Boolean)
      for (const line of lines) {
        reply.raw.write(`data: ${line}\n\n`)
      }
    }
  } catch (err: any) {
    reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  } finally {
    reply.raw.end()
  }
})

// DB Endpoints for Electron IPC proxying
app.post('/db/run', async (request, reply) => {
  const { sql, params } = request.body as { sql: string; params: any[] }
  const result = dbService.run(sql, params)
  return result
})

app.post('/db/get', async (request, reply) => {
  const { sql, params } = request.body as { sql: string; params: any[] }
  const result = dbService.get(sql, params)
  return result
})

app.post('/db/all', async (request, reply) => {
  const { sql, params } = request.body as { sql: string; params: any[] }
  const result = dbService.all(sql, params)
  return result
})

// Worker RPC proxy for Electron RAG / Voice
app.post('/worker/processDocument', async (request, reply) => {
  const { docId, filePath, filename, mimetype, sizeBytes } = request.body as any
  return workerManager.processDocument(docId, filePath, filename, mimetype, sizeBytes)
})

app.post('/worker/searchSimilar', async (request, reply) => {
  const { query, limit, minScore } = request.body as any
  return workerManager.searchSimilar(query, limit, minScore)
})

app.post('/worker/deleteDocument', async (request, reply) => {
  const { docId } = request.body as any
  return workerManager.deleteDocument(docId)
})

app.post('/worker/transcribeAudio', async (request, reply) => {
  const { pcmData, modelSize, language } = request.body as any
  return workerManager.transcribeAudio(pcmData, modelSize, language)
})

export async function startDaemon(port: number = 47392) {
  try {
    // Start child processes
    startSupervisedProcess('airllm')
    await ensureOllama()
    
    await app.listen({ port, host: '127.0.0.1' })
    logger.info(`Daemon listening on http://127.0.0.1:${port}`)
  } catch (err) {
    logger.error('Daemon failed to start', { error: err })
    process.exit(1)
  }
}

// If run directly
if (require.main === module) {
  startDaemon()
}
