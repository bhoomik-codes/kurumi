/**
 * Phase 9 — Cursed Speech: STT (Whisper) tasks for the UtilityProcess worker.
 *
 * Audio capture and TTS playback happen in the Renderer (Web Audio API) so no
 * native audio modules are needed here — avoiding ASAR headaches on Windows.
 * This module purely handles Whisper ONNX inference via @xenova/transformers.
 */

import { join } from 'path'
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@xenova/transformers'

// Eco-mode: unload model after 5 minutes of silence
const UNLOAD_AFTER_MS = 5 * 60 * 1000

export type WhisperModelSize = 'tiny' | 'base' | 'small'

const MODEL_IDS: Record<WhisperModelSize, string> = {
  tiny:  'Xenova/whisper-tiny',
  base:  'Xenova/whisper-base',
  small: 'Xenova/whisper-small',
}

export interface TranscribeResult {
  text: string
  language?: string
}

/** Singleton transcription runtime scoped to the worker process. */
export function createWhisperRuntime(cacheDir: string) {
  env.cacheDir = cacheDir
  env.allowRemoteModels = true
  env.allowLocalModels  = true

  let asr: AutomaticSpeechRecognitionPipeline | null = null
  let activeSize: WhisperModelSize | null = null
  let loading: Promise<void> | null = null
  let ecoTimer: ReturnType<typeof setTimeout> | null = null

  function resetEcoTimer() {
    if (ecoTimer) clearTimeout(ecoTimer)
    ecoTimer = setTimeout(() => {
      console.log('[voice-worker] Eco-mode: unloading Whisper after inactivity')
      asr = null
      activeSize = null
      ecoTimer = null
    }, UNLOAD_AFTER_MS)
  }

  async function ensureLoaded(size: WhisperModelSize = 'base') {
    if (asr && activeSize === size) return
    if (loading) { await loading; return }

    loading = (async () => {
      console.log(`[voice-worker] Loading Whisper model: ${MODEL_IDS[size]}`)
      asr = (await pipeline('automatic-speech-recognition', MODEL_IDS[size], {
        // Use float32 for broadest device compatibility
        dtype: 'fp32',
      })) as AutomaticSpeechRecognitionPipeline
      activeSize = size
      console.log(`[voice-worker] Whisper ${size} loaded`)
    })()

    try {
      await loading
    } finally {
      loading = null
    }
  }

  return {
    /**
     * Transcribe a 16kHz PCM Float32Array (transferred as regular JS array
     * because structured clone doesn't preserve typed arrays across UtilityProcess).
     */
    async transcribe(
      pcmData: number[],
      size: WhisperModelSize = 'base',
      language = 'english'
    ): Promise<TranscribeResult> {
      await ensureLoaded(size)
      if (!asr) throw new Error('Whisper model failed to load')

      resetEcoTimer()

      const audio = new Float32Array(pcmData)

      const output = await asr(audio, {
        language,
        task: 'transcribe',
        // Return timestamps so we can stream partial results in future
        return_timestamps: false,
      }) as { text: string }

      return {
        text: (output.text ?? '').trim(),
        language,
      }
    },

    unload(): void {
      if (ecoTimer) { clearTimeout(ecoTimer); ecoTimer = null }
      asr = null
      activeSize = null
    },
  }
}

export type WhisperRuntime = ReturnType<typeof createWhisperRuntime>
