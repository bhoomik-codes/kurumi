import { create } from 'zustand'

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
  activeModel: string | null
  isModelWarming: boolean
  warmingProgress: string  // human-readable status message

  setAvailableModels: (models: LocalModel[]) => void
  setActiveModel: (modelName: string | null, skipWarmup?: boolean) => void
  setIsWarming: (v: boolean, msg?: string) => void
}

export const useModelStore = create<ModelState>((set) => ({
  availableModels: [],
  activeModel: null,
  isModelWarming: false,
  warmingProgress: '',

  setAvailableModels: (models) => set({ availableModels: models }),

  setIsWarming: (v, msg = '') => set({ isModelWarming: v, warmingProgress: msg }),

  setActiveModel: (modelName, skipWarmup = false) => {
    set({ activeModel: modelName })
    // Persist default model choice
    if (modelName) {
      void window.electron?.invoke('settings:set', 'defaultModel', modelName)
    }

    if (modelName && !skipWarmup) {
      void (async () => {
        set({ isModelWarming: true, warmingProgress: 'Loading model into VRAM…' })
        try {
          await window.electron?.invoke('ollama:warmup', modelName)
          set({ warmingProgress: 'Model ready' })
          // Clear "ready" message after 2s
          setTimeout(() => set({ warmingProgress: '' }), 2000)
        } catch {
          set({ warmingProgress: '' })
        } finally {
          set({ isModelWarming: false })
        }
      })()
    }
  },
}))
