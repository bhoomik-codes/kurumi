export class OllamaService {
  public baseUrl = 'http://localhost:11434'
  private abortController: AbortController | null = null

  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, { method: 'GET' })
      return response.status === 200
    } catch {
      return false
    }
  }

  async getModels(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      const data = await response.json()
      return data.models || []
    } catch {
      return []
    }
  }

  async *streamChat(messages: any[], model: string, options: any = {}) {
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
