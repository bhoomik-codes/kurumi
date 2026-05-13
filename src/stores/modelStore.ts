import { create } from 'zustand'

const LS_IMAGE_CKPT = 'kurumi.imageGen.checkpoint'

function readStoredCheckpoint(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(LS_IMAGE_CKPT)
  } catch {
    return null
  }
}

export interface ModelParameters {
  temperature: number
  top_p: number
  top_k: number
  repeat_penalty: number
  num_ctx: number
  seed?: number
}

export interface LocalModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    format: string
    family: string
    parameter_size: string
    quantization_level: string
  }
}

interface ModelState {
  availableModels: LocalModel[]
  runningModels: any[]
  activeModel: string | null
  /** Automatic1111 checkpoint title (from /sdapi/v1/sd-models) */
  activeImageGenCheckpoint: string | null
  isModelWarming: boolean
  globalParameters: ModelParameters

  setAvailableModels: (models: LocalModel[]) => void
  setRunningModels: (models: any[]) => void
  setActiveModel: (modelName: string | null) => void
  setActiveImageGenCheckpoint: (checkpointTitle: string | null) => void
  warmupModel: (modelName: string) => Promise<boolean>
  updateParameters: (params: Partial<ModelParameters>) => void
}

export const useModelStore = create<ModelState>((set) => ({
  availableModels: [],
  runningModels: [],
  activeModel: null,
  activeImageGenCheckpoint: readStoredCheckpoint(),
  isModelWarming: false,
  globalParameters: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    num_ctx: 4096
  },

  setAvailableModels: (models) => set({ availableModels: models }),
  setRunningModels: (models) => set({ runningModels: models }),
  setActiveModel: (modelName) => {
    set({ activeModel: modelName })
    if (modelName) {
      // Fire-and-forget warmup to reduce first-token latency
      void (async () => {
        set({ isModelWarming: true })
        try {
          await window.electron?.invoke('ollama:warmup', modelName)
        } catch {
          // ignore warmup errors; chat send will surface real errors
        } finally {
          set({ isModelWarming: false })
        }
      })()
    } else {
      set({ isModelWarming: false })
    }
  },

  setActiveImageGenCheckpoint: (checkpointTitle) => {
    set({ activeImageGenCheckpoint: checkpointTitle })
    try {
      if (checkpointTitle) {
        localStorage.setItem(LS_IMAGE_CKPT, checkpointTitle)
      } else {
        localStorage.removeItem(LS_IMAGE_CKPT)
      }
    } catch {
      /* ignore */
    }
  },

  warmupModel: async (modelName) => {
    set({ isModelWarming: true })
    try {
      await window.electron?.invoke('ollama:warmup', modelName)
      return true
    } catch {
      return false
    } finally {
      set({ isModelWarming: false })
    }
  },
  updateParameters: (params) => set((state) => ({ 
    globalParameters: { ...state.globalParameters, ...params } 
  }))
}))
