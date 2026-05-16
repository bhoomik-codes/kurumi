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

export type EmbeddingRuntime = ReturnType<typeof createEmbeddingRuntime>

/** Stateless embedding pipeline scoped to a Hugging Face cache directory (e.g. userData/hf-cache). */
export function createEmbeddingRuntime(cacheDir: string) {
  env.cacheDir = cacheDir
  env.allowRemoteModels = true
  env.allowLocalModels = true

  let embedder: FeatureExtractionPipeline | null = null
  let activeModel: string | null = null
  let loading: Promise<void> | null = null

  async function ensureLoaded(modelName = DEFAULT_MODEL) {
    if (embedder && activeModel === modelName) return
    if (loading) {
      await loading
      return
    }

    loading = (async () => {
      embedder = (await pipeline('feature-extraction', modelName)) as FeatureExtractionPipeline
      activeModel = modelName
    })()

    try {
      await loading
    } finally {
      loading = null
    }
  }

  return {
    async embedText(text: string, modelName = DEFAULT_MODEL): Promise<number[]> {
      const clean = text.trim().slice(0, MAX_CHARS_PER_INPUT)
      if (!clean) return []
      await ensureLoaded(modelName)
      if (!embedder) throw new Error('Embedding model failed to load')

      const output = await embedder(clean, {
        pooling: 'mean',
        normalize: true,
      })

      const data = Array.from(output.data as Float32Array)
      return l2Normalize(data)
    },

    unload(): void {
      embedder = null
      activeModel = null
    },
  }
}

export function defaultHfCachePath(userDataRoot: string): string {
  return join(userDataRoot, 'hf-cache')
}
