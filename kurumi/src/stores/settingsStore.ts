import { create } from 'zustand'

export interface ModelParams {
  temperature: number
  top_p: number
  top_k: number
  repeat_penalty: number
  num_ctx: number
}

const DEFAULT_PARAMS: ModelParams = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  num_ctx: 4096,
}

interface SettingsState {
  // Persistence
  isLoaded: boolean

  // LLM
  defaultModel: string | null
  modelParams: ModelParams

  // RAG
  ragChunkSize: number       // chars per chunk
  ragChunkOverlap: number    // overlap chars
  ragTopK: number            // chunks retrieved per query
  ragMinScore: number        // minimum similarity threshold
  ragEmbeddingModel: string  // which model to use for embeddings

  // Connection
  ollamaUrl: string

  // Theme
  themeAccent: string

  // System stats (runtime only, not persisted)
  systemStats: {
    gpuName: string
    vramUsed: number
    vramTotal: number
    ramUsed: number
    ramTotal: number
    tokensPerSecond: number
    vramSource?: 'nvidia' | 'ollama' | 'unknown'
  }

  // Actions
  loadFromDB: () => Promise<void>
  setSetting: <K extends keyof Omit<SettingsState, 'systemStats' | 'isLoaded' | 'loadFromDB' | 'setSetting' | 'updateSystemStats'>>(
    key: K, value: SettingsState[K]
  ) => void
  updateSystemStats: (stats: Partial<SettingsState['systemStats']>) => void
  setOllamaUrl: (url: string) => void
  setThemeAccent: (accent: string) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isLoaded: false,

  defaultModel: null,
  modelParams: { ...DEFAULT_PARAMS },

  ragChunkSize: 1800,
  ragChunkOverlap: 200,
  ragTopK: 3,
  ragMinScore: 0.25,
  ragEmbeddingModel: 'nomic-embed-text',

  ollamaUrl: 'http://localhost:11434',
  themeAccent: 'red-core',

  systemStats: {
    gpuName: 'Unknown GPU',
    vramUsed: 0,
    vramTotal: 0,
    ramUsed: 0,
    ramTotal: 0,
    tokensPerSecond: 0,
    vramSource: 'unknown',
  },

  loadFromDB: async () => {
    try {
      const all = await window.electron?.invoke('settings:getAll') as Record<string, any> | null
      if (!all) return
      set(state => ({
        isLoaded: true,
        defaultModel:      all['defaultModel']      ?? state.defaultModel,
        modelParams:       all['modelParams']        ?? state.modelParams,
        ragChunkSize:      all['ragChunkSize']       ?? state.ragChunkSize,
        ragChunkOverlap:   all['ragChunkOverlap']    ?? state.ragChunkOverlap,
        ragTopK:           all['ragTopK']            ?? state.ragTopK,
        ragMinScore:       all['ragMinScore']        ?? state.ragMinScore,
        ragEmbeddingModel: all['ragEmbeddingModel']  ?? state.ragEmbeddingModel,
        ollamaUrl:         all['ollamaUrl']          ?? state.ollamaUrl,
        themeAccent:       all['themeAccent']        ?? state.themeAccent,
      }))
    } catch {
      set({ isLoaded: true })
    }
  },

  setSetting: (key, value) => {
    set({ [key]: value } as any)
    void window.electron?.invoke('settings:set', key as string, value)
  },

  updateSystemStats: (stats) => set(state => ({
    systemStats: { ...state.systemStats, ...stats }
  })),

  setOllamaUrl: (url) => {
    set({ ollamaUrl: url })
    void window.electron?.invoke('settings:set', 'ollamaUrl', url)
  },

  setThemeAccent: (accent) => {
    set({ themeAccent: accent })
    void window.electron?.invoke('settings:set', 'themeAccent', accent)
  },
}))
