/**
 * Phase 9 — Cursed Speech: Voice state store.
 *
 * Tracks recording/playback lifecycle and user voice preferences.
 * All persisted settings (model size, TTS voice, auto-read) are synced
 * through the existing settings:set / settings:get IPC channel.
 */

import { create } from 'zustand'

export type VoiceStatus =
  | 'idle'         // nothing happening
  | 'recording'    // mic is capturing audio
  | 'processing'   // PCM sent to worker, waiting for transcript
  | 'speaking'     // TTS audio is playing back

export type SttModelSize = 'tiny' | 'base' | 'small'

export type TtsVoice =
  | 'cursed'        // default — deep, dramatic
  | 'whisper'       // soft, low pitch
  | 'domain'        // fast cadence

export interface VoiceState {
  // Runtime state (not persisted)
  status: VoiceStatus
  partialTranscript: string       // live text as user speaks
  isWorkerReady: boolean

  // Waveform data (Float32, updated every animation frame while recording)
  waveformData: Float32Array

  // User preferences (persisted via settings store)
  sttModel: SttModelSize
  ttsVoice: TtsVoice
  autoRead: boolean               // automatically speak every assistant reply
  sttLanguage: string             // e.g. 'english', 'hindi', 'french'
  ttsSpeed: number                // 0.5 – 2.0

  // Actions
  setStatus: (s: VoiceStatus) => void
  setPartialTranscript: (t: string) => void
  setWorkerReady: (r: boolean) => void
  setWaveformData: (d: Float32Array) => void
  setSttModel: (m: SttModelSize) => void
  setTtsVoice: (v: TtsVoice) => void
  setAutoRead: (a: boolean) => void
  setSttLanguage: (l: string) => void
  setTtsSpeed: (s: number) => void
  loadVoicePrefs: () => Promise<void>
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: 'idle',
  partialTranscript: '',
  isWorkerReady: false,
  waveformData: new Float32Array(64).fill(0),

  sttModel: 'base',
  ttsVoice: 'cursed',
  autoRead: false,
  sttLanguage: 'english',
  ttsSpeed: 1.0,

  setStatus:           (status)           => set({ status }),
  setPartialTranscript:(partialTranscript) => set({ partialTranscript }),
  setWorkerReady:      (isWorkerReady)    => set({ isWorkerReady }),
  setWaveformData:     (waveformData)     => set({ waveformData }),

  setSttModel: (sttModel) => {
    set({ sttModel })
    void window.electron?.invoke('settings:set', 'voice.sttModel', sttModel)
  },
  setTtsVoice: (ttsVoice) => {
    set({ ttsVoice })
    void window.electron?.invoke('settings:set', 'voice.ttsVoice', ttsVoice)
  },
  setAutoRead: (autoRead) => {
    set({ autoRead })
    void window.electron?.invoke('settings:set', 'voice.autoRead', autoRead)
  },
  setSttLanguage: (sttLanguage) => {
    set({ sttLanguage })
    void window.electron?.invoke('settings:set', 'voice.sttLanguage', sttLanguage)
  },
  setTtsSpeed: (ttsSpeed) => {
    set({ ttsSpeed })
    void window.electron?.invoke('settings:set', 'voice.ttsSpeed', ttsSpeed)
  },

  loadVoicePrefs: async () => {
    try {
      const all = await window.electron?.invoke('settings:getAll') as Record<string, any> | null
      if (!all) return
      set({
        sttModel:    all['voice.sttModel']    ?? 'base',
        ttsVoice:    all['voice.ttsVoice']    ?? 'cursed',
        autoRead:    all['voice.autoRead']    ?? false,
        sttLanguage: all['voice.sttLanguage'] ?? 'english',
        ttsSpeed:    all['voice.ttsSpeed']    ?? 1.0,
      })
    } catch {
      /* keep defaults */
    }
  },
}))
