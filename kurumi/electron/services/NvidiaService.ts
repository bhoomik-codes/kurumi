// NVIDIA NIM API — OpenAI-compatible endpoint
// Docs: https://docs.api.nvidia.com/nim/reference/

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'

// Curated list of top generative LLMs available on NVIDIA NIM
// (Filters out embeddings, VLMs, code-only models for the main chat list)
export const NVIDIA_FEATURED_MODELS = [
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1',   label: 'Nemotron Super 49B',      tag: 'NVIDIA' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',  label: 'Nemotron Ultra 253B',     tag: 'NVIDIA' },
  { id: 'meta/llama-3.3-70b-instruct',              label: 'Llama 3.3 70B Instruct',  tag: 'Meta' },
  { id: 'meta/llama-3.1-405b-instruct',             label: 'Llama 3.1 405B Instruct', tag: 'Meta' },
  { id: 'meta/llama-3.1-8b-instruct',               label: 'Llama 3.1 8B Instruct',   tag: 'Meta' },
  { id: 'mistralai/mistral-large-2-instruct',       label: 'Mistral Large 2',          tag: 'Mistral' },
  { id: 'mistralai/mixtral-8x22b-instruct-v0.1',    label: 'Mixtral 8x22B',           tag: 'Mistral' },
  { id: 'qwen/qwen2.5-72b-instruct',               label: 'Qwen 2.5 72B Instruct',   tag: 'Qwen' },
  { id: 'deepseek-ai/deepseek-v4-flash',            label: 'DeepSeek V4 Flash',       tag: 'DeepSeek' },
  { id: 'deepseek-ai/deepseek-v4-pro',              label: 'DeepSeek V4 Pro',         tag: 'DeepSeek' },
  { id: 'google/gemma-3-27b-it',                    label: 'Gemma 3 27B',             tag: 'Google' },
  { id: 'databricks/dbrx-instruct',                 label: 'DBRX Instruct',           tag: 'Databricks' },
  { id: 'ai21labs/jamba-1.5-large-instruct',        label: 'Jamba 1.5 Large',         tag: 'AI21' },
]

export class NvidiaService {
  private abortController: AbortController | null = null

  // Validate API key is reachable
  async checkKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${NVIDIA_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) return { ok: true }
      const body = await res.text()
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 120)}` }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // List all available models from NVIDIA API (returns generative ones only)
  async getModels(apiKey: string): Promise<any[]> {
    try {
      const res = await fetch(`${NVIDIA_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return NVIDIA_FEATURED_MODELS

      const data = await res.json()
      const all: any[] = data.data ?? []
      // Filter known embedding/vision/audio model patterns
      const SKIP_PATTERNS = ['embed', 'clip', 'vlm', 'vision', 'rerank', 'whisper', 'tts', 'coder', 'deplot', 'fuyu', 'bge-']
      return all
        .filter(m => !SKIP_PATTERNS.some(p => m.id.toLowerCase().includes(p)))
        .map(m => ({ id: m.id, label: m.id, tag: m.id.split('/')[0] }))
    } catch {
      return NVIDIA_FEATURED_MODELS
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  // Streaming OpenAI-compatible chat completions
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

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`NVIDIA API error (${response.status}): ${errText.slice(0, 200)}`)
    }

    if (!response.body) throw new Error('No response body from NVIDIA API')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n').filter(l => l.startsWith('data:'))

        for (const line of lines) {
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') return
          try {
            const data = JSON.parse(payload)
            const delta = data.choices?.[0]?.delta
            const finish = data.choices?.[0]?.finish_reason
            if (delta?.content) {
              yield { content: delta.content, done: false }
            }
            if (finish) {
              yield {
                content: '',
                done: true,
                usage: data.usage ?? null,
              }
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}

export const nvidiaService = new NvidiaService()
