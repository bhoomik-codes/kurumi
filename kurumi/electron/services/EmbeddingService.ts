import { app } from 'electron'
import { join } from 'path'
import { env, pipeline, type FeatureExtractionPipeline } from '@xenova/transformers'

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2'
const MAX_CHARS_PER_INPUT = 8000

function l2Normalize(vec: number[]): number[] {
  let sum = 0
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i]
  const mag = Math.sqrt(sum) || 1
  return vec.map((v) => v / mag)
}

class EmbeddingService {
  private embedder: FeatureExtractionPipeline | null = null
  private activeModel: string | null = null
  private loading: Promise<void> | null = null

  constructor() {
    // Keep model cache local to app userData.
    env.cacheDir = join(app.getPath('userData'), 'hf-cache')
    env.allowRemoteModels = true
    env.allowLocalModels = true
  }

  private async ensureLoaded(modelName = DEFAULT_MODEL) {
    if (this.embedder && this.activeModel === modelName) return
    if (this.loading) {
      await this.loading
      return
    }

    this.loading = (async () => {
      this.embedder = (await pipeline(
        'feature-extraction',
        modelName
      )) as FeatureExtractionPipeline
      this.activeModel = modelName
    })()

    try {
      await this.loading
    } finally {
      this.loading = null
    }
  }

  public async embedText(text: string, modelName = DEFAULT_MODEL): Promise<number[]> {
    const clean = text.trim().slice(0, MAX_CHARS_PER_INPUT)
    if (!clean) return []
    await this.ensureLoaded(modelName)
    if (!this.embedder) throw new Error('Embedding model failed to load')

    const output = await this.embedder(clean, {
      pooling: 'mean',
      normalize: true,
    })

    const data = Array.from(output.data as Float32Array)
    return l2Normalize(data)
  }

  public async embedMany(
    chunks: string[],
    onProgress?: (done: number, total: number) => void
  ): Promise<number[][]> {
    await this.ensureLoaded()
    const out: number[][] = []
    for (let i = 0; i < chunks.length; i++) {
      out.push(await this.embedText(chunks[i]))
      onProgress?.(i + 1, chunks.length)
      if ((i + 1) % 2 === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve))
      }
    }
    return out
  }

  public unload(): void {
    // Allow GC to reclaim model tensors/weights.
    this.embedder = null
    this.activeModel = null
  }
}

export const embeddingService = new EmbeddingService()
