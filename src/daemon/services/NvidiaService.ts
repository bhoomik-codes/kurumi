// NVIDIA NIM API — OpenAI-compatible endpoint
// Docs: https://docs.api.nvidia.com/nim/reference/

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'

// ── Verified working on NVIDIA NIM free tier (tested May 2026) ──────────────
// HTTP 000 / 404 models have been removed. Add more as you upgrade your plan.
export const NVIDIA_FEATURED_MODELS = [
  { id: 'meta/llama-3.1-8b-instruct',              label: 'Llama 3.1 8B Instruct',   tag: 'Meta'     },
  { id: 'meta/llama-3.3-70b-instruct',             label: 'Llama 3.3 70B Instruct',  tag: 'Meta'     },
  { id: 'meta/llama-3.1-405b-instruct',            label: 'Llama 3.1 405B Instruct', tag: 'Meta'     },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1',  label: 'Nemotron Super 49B',       tag: 'NVIDIA'   },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', label: 'Nemotron Ultra 253B',      tag: 'NVIDIA'   },
  { id: 'google/gemma-3-27b-it',                   label: 'Gemma 3 27B',              tag: 'Google'   },
  { id: 'google/gemma-3-12b-it',                   label: 'Gemma 3 12B',              tag: 'Google'   },
  { id: 'ai21labs/jamba-1.5-large-instruct',       label: 'Jamba 1.5 Large',          tag: 'AI21'     },
  { id: 'databricks/dbrx-instruct',                label: 'DBRX Instruct',            tag: 'Databricks'},
  { id: 'bytedance/seed-oss-36b-instruct',         label: 'Seed OSS 36B',             tag: 'ByteDance'},
]

export class NvidiaService {
  private abortController: AbortController | null = null

  async checkKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${NVIDIA_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) return { ok: true }
      const body = await res.text()
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  /**
   * Probe whether a model is accessible on the user's NIM plan.
   * Uses a minimal non-streaming request with a short timeout.
   * Returns true = available, false = plan-gated / geo-blocked / not found.
   */
  async probeModel(modelId: string, apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: '.' }],
          stream: false,
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(6000),
      })
      // 200 = available, 402/403/404 = not on plan
      return res.status === 200
    } catch {
      // fetch failed (TCP refused) or timeout = not available
      return false
    }
  }

  async getModels(apiKey: string): Promise<any[]> {
    // Start with the curated list as the base
    let baseModels = [...NVIDIA_FEATURED_MODELS]

    // Try to fetch live model list from API and merge it in
    try {
      const res = await fetch(`${NVIDIA_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data = await res.json()
        const all: any[] = data.data ?? []
        const SKIP_PATTERNS = ['embed', 'clip', 'vlm', 'vision', 'rerank', 'whisper', 'tts', 'coder', 'deplot', 'fuyu', 'bge-']
        const live = all
          .filter(m => !SKIP_PATTERNS.some(p => m.id.toLowerCase().includes(p)))
          .map(m => ({ id: m.id, label: m.id.split('/')[1] ?? m.id, tag: m.id.split('/')[0], available: false }))
        // Merge: keep featured order, add any extra from live list
        const featuredIds = new Set(baseModels.map(m => m.id))
        const extras = live.filter(m => !featuredIds.has(m.id))
        baseModels = [...baseModels.map(m => ({ ...m, available: false })), ...extras]
        console.log(`[NVIDIA] ${baseModels.length} models to probe (${extras.length} extras from live list)`)
      }
    } catch (err: any) {
      console.warn('[NVIDIA] Could not fetch live model list, using featured:', err.message)
      baseModels = baseModels.map(m => ({ ...m, available: false }))
    }

    // Probe all models in parallel for availability
    console.log(`[NVIDIA] Probing ${baseModels.length} models in parallel (6s timeout each)…`)
    const probeResults = await Promise.all(
      baseModels.map(m => this.probeModel(m.id, apiKey))
    )
    const result = baseModels.map((m, i) => ({ ...m, available: probeResults[i] }))
    const availCount = result.filter(m => m.available).length
    console.log(`[NVIDIA] Probe complete — ${availCount}/${result.length} models available`)
    return result
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Stream chat completions from NVIDIA NIM.
   *
   * NVIDIA SSE format notes (verified via curl):
   *  - Each chunk is:  data: <JSON>\n\n
   *  - Content chunks: choices[0].delta.content = "token"
   *  - Finish chunk:   choices[0].finish_reason = "stop", delta has NO content field
   *  - Usage chunk:    choices = [] (empty array), usage = {...}
   *  - Final sentinel: data: [DONE]
   *
   * BUG FIXED: previous version required delta.content to be present to emit
   * `done:true`, which means the finish chunk (no content) was silently dropped
   * and the stream never terminated on the frontend.
   */
  async *streamChat(
    messages: { role: string; content: string }[],
    model: string,
    apiKey: string,
    options: { temperature?: number; top_p?: number; max_tokens?: number } = {}
  ) {
    this.abort()
    this.abortController = new AbortController()

    const body = {
      model,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.6,
      top_p:       options.top_p       ?? 0.95,
      max_tokens:  options.max_tokens  ?? 4096,
    }

    console.log(`[NVIDIA] Starting stream — model: ${model}, temp: ${body.temperature}`)

    let response: Response
    try {
      response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      })
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request cancelled.')
      }
      // Node.js undici throws "fetch failed" (TypeError) when the server refuses the
      // TCP connection entirely (HTTP 000) — this happens for geo-restricted or
      // plan-gated models like deepseek-v4-flash on the free NIM tier.
      const isTcpRefused = err instanceof TypeError && err.message === 'fetch failed'
      if (isTcpRefused) {
        const msg = `The model "${model}" is not available on your NVIDIA NIM plan (connection refused).\n\nTry: meta/llama-3.1-8b-instruct or meta/llama-3.3-70b-instruct — those are confirmed free-tier.`
        console.error('[NVIDIA] TCP connection refused for model:', model)
        throw new Error(msg)
      }
      const msg = `Network error reaching NVIDIA API: ${err.message}`
      console.error('[NVIDIA] fetch error:', msg)
      throw new Error(msg)
    }

    if (!response.ok) {
      let errBody = ''
      try { errBody = await response.text() } catch {}
      const msg = `NVIDIA API error ${response.status} ${response.statusText}: ${errBody.slice(0, 300)}`
      console.error('[NVIDIA]', msg)
      throw new Error(msg)
    }

    if (!response.body) {
      throw new Error('NVIDIA API returned an empty response body.')
    }

    console.log(`[NVIDIA] Stream connected, reading SSE…`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let totalTokens = 0
    let chunkCount = 0
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log(`[NVIDIA] Stream EOF — ${chunkCount} SSE chunks, ~${totalTokens} tokens`)
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Split on double-newline (SSE event boundary)
        const events = buffer.split('\n\n')
        // Keep the last incomplete event in the buffer
        buffer = events.pop() ?? ''

        for (const event of events) {
          const lines = event.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()

            if (payload === '[DONE]') {
              console.log('[NVIDIA] Received [DONE] sentinel')
              // Emit the done signal — this is what closes the stream on the frontend
              yield { content: '', done: true, totalTokens }
              return
            }

            try {
              const data = JSON.parse(payload)
              chunkCount++

              // Usage-only chunk (choices is empty array)
              if (!Array.isArray(data.choices) || data.choices.length === 0) {
                if (data.usage) {
                  totalTokens = data.usage.total_tokens ?? totalTokens
                  console.log(`[NVIDIA] Usage — prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}`)
                }
                continue
              }

              const choice = data.choices[0]
              const delta = choice?.delta ?? {}
              const finishReason = choice?.finish_reason

              // Yield content if present
              if (delta.content) {
                yield { content: delta.content, done: false }
              }

              // Finish chunk — finish_reason is set (e.g. "stop", "length")
              // NOTE: The content field may be absent here. Do NOT require it.
              if (finishReason) {
                console.log(`[NVIDIA] finish_reason=${finishReason}`)
                // Don't yield done here — wait for the explicit [DONE] sentinel
                // to avoid double-triggering. The [DONE] branch above handles it.
              }
            } catch (parseErr: any) {
              console.warn('[NVIDIA] Failed to parse SSE payload:', payload, parseErr.message)
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[NVIDIA] Stream aborted by user')
        return
      }
      console.error('[NVIDIA] Stream read error:', err.message)
      throw new Error(`Stream interrupted: ${err.message}`)
    } finally {
      reader.releaseLock()
      this.abortController = null
    }
  }
}

export const nvidiaService = new NvidiaService()
