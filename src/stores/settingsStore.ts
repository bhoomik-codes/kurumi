import { create } from 'zustand'

interface SettingsState {
  ollamaUrl: string
  themeAccent: string
  systemStats: {
    gpuName: string
    vramUsed: number
    vramTotal: number
    ramUsed: number
    ramTotal: number
    tokensPerSecond: number
  }

  setOllamaUrl: (url: string) => void
  setThemeAccent: (accent: string) => void
  updateSystemStats: (stats: Partial<SettingsState['systemStats']>) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ollamaUrl: 'http://localhost:11434',
  themeAccent: 'red-core',
  systemStats: {
    gpuName: 'Unknown GPU',
    vramUsed: 0,
    vramTotal: 0,
    ramUsed: 0,
    ramTotal: 0,
    tokensPerSecond: 0
  },

  setOllamaUrl: (url) => set({ ollamaUrl: url }),
  setThemeAccent: (accent) => set({ themeAccent: accent }),
  updateSystemStats: (stats) => set((state) => ({
    systemStats: { ...state.systemStats, ...stats }
  }))
}))
