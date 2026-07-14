// AirLLMService.ts
// Talks to the local AirLLM FastAPI server (airllm_server.py) running on port 8765.
// Uses the OpenAI-compatible SSE streaming format — identical to NvidiaService.

export const AIRLLM_BASE_URL = 'http://127.0.0.1:8765/v1'
export const AIRLLM_ROOT_URL = 'http://127.0.0.1:8765'

export class AirLLMService {
  private abortController: AbortController | null = null

  /**
   * Check whether the AirLLM server is up and return the loaded model name.
   */
  async checkStatus(): Promise<{ ok: boolean; model?: string; error?: string }> {
    try {
      const res = await fetch(AIRLLM_ROOT_URL, {
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
      const data = await res.json()
      return { ok: true, model: data.model }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  /**
   * Fetch the list of models served by the AirLLM server.
   */
  async getModels(): Promise<{ id: string; label: string }[]> {
    try {
      const res = await fetch(`${AIRLLM_BASE_URL}/models`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data.data ?? []).map((m: any) => ({
        id: m.id,
        label: m.id.split('/').pop() ?? m.id,
      }))
    } catch {
      return []
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Stream chat completions from the local AirLLM server.
   * Yields { content, done } objects — same shape as NvidiaService.streamChat.
   */
  async *streamChat(
    messages: { role: string; content: string }[],
    model: string,
    options: { max_tokens?: number; temperature?: number; top_p?: number } = {}
  ) {
    this.abort()
    this.abortController = new AbortController()

    let response: Response
    try {
      response = await fetch(`${AIRLLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: options.max_tokens ?? 512,
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p ?? 0.9,
        }),
        signal: this.abortController.signal,
      })
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('Request cancelled.')
      throw new Error(
        `Could not connect to AirLLM server at ${AIRLLM_ROOT_URL}. ` +
        `Is airllm_server.py running? Error: ${err.message}`
      )
    }

    if (!response.ok) {
      let body = ''
      try { body = await response.text() } catch { /* ignore */ }
      throw new Error(`AirLLM server error ${response.status}: ${body.slice(0, 300)}`)
    }

    if (!response.body) throw new Error('AirLLM server returned an empty response body.')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          for (const line of event.split('\n')) {
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()

            if (payload === '[DONE]') {
              yield { content: '', done: true }
              return
            }

            try {
              const data = JSON.parse(payload)
              const content = data.choices?.[0]?.delta?.content ?? ''
              const finishReason = data.choices?.[0]?.finish_reason

              if (content) yield { content, done: false }

              if (finishReason === 'stop') {
                yield { content: '', done: true }
                return
              }
            } catch {
              /* skip malformed SSE lines */
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      throw new Error(`AirLLM stream interrupted: ${err.message}`)
    } finally {
      reader.releaseLock()
      this.abortController = null
    }
  }
}

export const airllmService = new AirLLMService()
