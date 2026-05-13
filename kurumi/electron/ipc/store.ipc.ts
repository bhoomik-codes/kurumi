import { ipcMain } from 'electron'

const OLLAMA_SEARCH_URL = 'https://ollama.com/search'
const HF_API_URL = 'https://huggingface.co/api/models'

interface OllamaSearchResult {
  name: string
  description: string
  pulls: number
  tags: number
  updated: string
}

interface HFModel {
  id: string
  likes: number
  downloads: number
  tags: string[]
  pipeline_tag?: string
  createdAt: string
  modelId: string
}

export function registerStoreIpc() {
  // ─── Ollama Library Search ────────────────────────────────────────────────
  ipcMain.handle('store:ollama:search', async (_event, { query = '', page = 1 }: { query?: string; page?: number }) => {
    try {
      const params = new URLSearchParams({ q: query, p: String(page) })
      const res = await fetch(`${OLLAMA_SEARCH_URL}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Kurumi-LLM-Client/1.0'
        }
      })

      if (!res.ok) throw new Error(`Status ${res.status}`)
      const contentType = res.headers.get('content-type') || ''

      // If Ollama returns JSON directly
      if (contentType.includes('application/json')) {
        const data = await res.json()
        return { success: true, models: data?.models || data || [] }
      }

      // Otherwise parse HTML to extract model cards
      const html = await res.text()
      const models = parseOllamaHtml(html)
      return { success: true, models }
    } catch (err: any) {
      return { success: false, error: err.message, models: [] }
    }
  })

  // ─── HuggingFace Search ───────────────────────────────────────────────────
  ipcMain.handle('store:hf:search', async (_event, { query = '', sort = 'downloads', limit = 24, page = 0, catalog = 'all' }: {
    query?: string; sort?: string; limit?: number; page?: number
    catalog?: 'all' | 'language' | 'image'
  }) => {
    try {
      const params = new URLSearchParams({
        library: 'gguf',
        sort,
        direction: '-1',
        limit: String(limit),
        skip: String(page * limit),
        full: 'false',
        config: 'false',
      })
      if (query) params.set('search', query)
      if (catalog === 'language') {
        params.set('pipeline_tag', 'text-generation')
      } else if (catalog === 'image') {
        params.set('filter', 'stable-diffusion')
      }

      const res = await fetch(`${HF_API_URL}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Kurumi-LLM-Client/1.0'
        }
      })

      if (!res.ok) throw new Error(`HuggingFace API error: ${res.status}`)
      const models: HFModel[] = await res.json()
      return { success: true, models }
    } catch (err: any) {
      return { success: false, error: err.message, models: [] }
    }
  })

  // ─── HuggingFace Model Tags (quantizations) ───────────────────────────────
  ipcMain.handle('store:hf:model-files', async (_event, modelId: string) => {
    try {
      const res = await fetch(`https://huggingface.co/api/models/${modelId}?blobs=false`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Kurumi-LLM-Client/1.0' }
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      // Filter to only GGUF files
      const ggufFiles = (data.siblings || [])
        .filter((f: any) => f.rfilename?.endsWith('.gguf') && !f.rfilename.includes('-of-'))
        .map((f: any) => ({
          filename: f.rfilename,
          // Extract quantization from filename e.g. "model-Q4_K_M.gguf" -> "Q4_K_M"
          quant: f.rfilename.replace(/\.gguf$/, '').split('-').pop() || f.rfilename,
          size: f.size,
        }))
      return { success: true, files: ggufFiles }
    } catch (err: any) {
      return { success: false, error: err.message, files: [] }
    }
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseOllamaHtml(html: string): OllamaSearchResult[] {
  const models: OllamaSearchResult[] = []
  // Extract model list items from Ollama's HTML
  // Their search page renders <li> items with model info
  const itemRegex = /href="\/library\/([\w.-]+)"[^>]*>.*?<\/li>/gs
  const nameRegex = /href="\/library\/([\w.-]+)"/
  const descRegex = /<p[^>]*class="[^"]*truncate[^"]*"[^>]*>([^<]+)<\/p>/
  const pullRegex = /(\d[\d.,KMB]+)\s*Pulls/i
  const tagRegex = /(\d+)\s*Tags/i

  let match
  const blocks = html.split('href="/library/').slice(1)

  for (const block of blocks.slice(0, 30)) {
    const nameMatch = block.match(/^([\w.-]+)/)
    if (!nameMatch) continue
    const name = nameMatch[1]
    const descMatch = block.match(/class="[^"]*text-[^"]*"[^>]*>([^<]{10,200})<\//)
    const pullMatch = block.match(/(\d[\d.,]+)\s*[KMB]?\s*Pull/i)
    const tagMatch = block.match(/(\d+)\s*Tag/i)

    models.push({
      name,
      description: descMatch?.[1]?.trim() || '',
      pulls: pullMatch ? parseInt(pullMatch[1].replace(/,/g, '')) : 0,
      tags: tagMatch ? parseInt(tagMatch[1]) : 0,
      updated: '',
    })
  }

  return models
}
