import { create } from 'zustand'

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
  globalParameters: ModelParameters
  
  setAvailableModels: (models: LocalModel[]) => void
  setRunningModels: (models: any[]) => void
  setActiveModel: (modelName: string | null) => void
  updateParameters: (params: Partial<ModelParameters>) => void
}

export const useModelStore = create<ModelState>((set) => ({
  availableModels: [],
  runningModels: [],
  activeModel: null,
  globalParameters: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    num_ctx: 4096
  },

  setAvailableModels: (models) => set({ availableModels: models }),
  setRunningModels: (models) => set({ runningModels: models }),
  setActiveModel: (modelName) => set({ activeModel: modelName }),
  updateParameters: (params) => set((state) => ({ 
    globalParameters: { ...state.globalParameters, ...params } 
  }))
}))
