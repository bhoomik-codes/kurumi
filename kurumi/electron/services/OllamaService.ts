export class OllamaService {
  public baseUrl = 'http://localhost:11434'
  private abortController: AbortController | null = null
  private warmupAbort: AbortController | null = null

  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, { method: 'GET' })
      return response.status === 200
    } catch {
      return false
    }
  }

  // Known embedding-only model families to exclude from the chat model selector
  private static EMBEDDING_FAMILIES = new Set([
    'nomic-bert', 'bert', 'clip', 'reranker',
  ])
  private static EMBEDDING_NAME_PATTERNS = [
    'embed', 'embedding', 'e5-', 'bge-', 'gte-', 'minilm'
  ]

  async getModels(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      const data = await response.json()
      const all: any[] = data.models || []
      // Strip embedding models so the chat model picker only shows generative LLMs
      return all.filter(m => {
        const family = (m.details?.family ?? '').toLowerCase()
        const name   = (m.name ?? '').toLowerCase()
        if (OllamaService.EMBEDDING_FAMILIES.has(family)) return false
        if (OllamaService.EMBEDDING_NAME_PATTERNS.some(p => name.includes(p))) return false
        return true
      })
    } catch {
      return []
    }
  }

  abortWarmup() {
    if (this.warmupAbort) {
      this.warmupAbort.abort()
      this.warmupAbort = null
    }
  }

  async warmup(model: string): Promise<boolean> {
    this.abortWarmup()
    const ac = new AbortController()
    this.warmupAbort = ac
    const signal = ac.signal
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: ' ' }],
          options: { num_predict: 1 },
          stream: false
        }),
        signal,
      })
      return response.ok
    } catch (err: any) {
      if (err?.name === 'AbortError') return false
      return false
    } finally {
      if (this.warmupAbort === ac) this.warmupAbort = null
    }
  }

  async *streamChat(messages: any[], model: string, options: any = {}) {
    this.abortWarmup()
    this.abortController = new AbortController()
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        options,
        stream: true
      }),
      signal: this.abortController.signal
    })

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.statusText}`)
    }
    
    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            yield data
          } catch (e) {
            console.warn('Failed to parse Ollama JSON chunk', line)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  abortCurrentStream() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}

export const ollamaService = new OllamaService()
