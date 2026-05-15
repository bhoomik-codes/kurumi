/**
 * Phase 9 — Cursed Speech: Voice logic hook.
 *
 * STT path:
 *   MediaDevices.getUserMedia (16kHz mono) → ScriptProcessorNode collects PCM
 *   → on stopRecording: PCM array sent via IPC → Whisper in UtilityProcess
 *   → transcript text injected into ChatInput via onTranscript callback.
 *
 * TTS path:
 *   Uses the browser's built-in SpeechSynthesis API (cross-platform, offline,
 *   zero dependencies). On Fedora/Linux this uses eSpeak-ng or system TTS.
 *   On Windows it uses the Windows speech runtime. No ONNX model download
 *   required for launch — we can upgrade to Kokoro/SpeechT5 in a future phase.
 *
 * GPU acceleration note:
 *   Whisper ONNX inference runs in the UtilityProcess (Node.js), which means
 *   ONNX Runtime's CUDA/DirectML execution providers can be activated there
 *   once onnxruntime-node@gpu lands stably. The browser-side SpeechSynthesis
 *   is handled natively by the OS speech engine.
 */

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useVoiceStore } from '../stores/voiceStore'

// 16kHz is the required sample rate for Whisper
const TARGET_SAMPLE_RATE = 16000
// Collect audio in 4096-sample chunks
const BUFFER_SIZE = 4096

export interface UseVoiceOptions {
  onTranscript: (text: string) => void
}

export function useVoice({ onTranscript }: UseVoiceOptions) {
  const {
    status, sttModel, sttLanguage, ttsVoice, ttsSpeed,
    setStatus, setPartialTranscript, setWaveformData, setWorkerReady,
  } = useVoiceStore()

  const audioCtxRef        = useRef<AudioContext | null>(null)
  const streamRef          = useRef<MediaStream | null>(null)
  const processorRef       = useRef<ScriptProcessorNode | null>(null)
  const sourceRef          = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef        = useRef<AnalyserNode | null>(null)
  const pcmBufferRef       = useRef<number[]>([])
  const rafRef             = useRef<number>(0)
  const synthRef           = useRef<SpeechSynthesisUtterance | null>(null)

  // ── Waveform animation loop ─────────────────────────────────────────────────
  const animateWaveform = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buf)
    // Downsample to 64 points for rendering
    const step = Math.floor(buf.length / 64)
    const out = new Float32Array(64)
    for (let i = 0; i < 64; i++) out[i] = buf[i * step] ?? 0
    setWaveformData(out)
    rafRef.current = requestAnimationFrame(animateWaveform)
  }, [setWaveformData])

  // ── Start recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (status !== 'idle') return

    // Check worker readiness
    const workerState = await window.electron?.invoke('voice:worker-ready')
    if (!workerState?.ready) {
      toast.error('⛩️ Cursed Core not ready — RAG worker is initializing. Try again in a moment.', {
        style: { background: '#1A0008', border: '1px solid rgba(196,30,58,0.4)', color: '#F5E6E8' }
      })
      return
    }
    setWorkerReady(true)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: TARGET_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      })
    } catch (err: any) {
      const code = err?.name ?? ''
      const msg = code === 'NotAllowedError' || code === 'PermissionDeniedError'
        ? '🩸 Mic permission denied — grant access in your system settings.'
        : code === 'NotFoundError'
          ? '🩸 No microphone found — plug one in and retry.'
          : `🩸 Mic error: ${err?.message ?? 'Unknown'}`
      toast.error(msg, {
        style: { background: '#1A0008', border: '1px solid rgba(196,30,58,0.4)', color: '#F5E6E8' }
      })
      return
    }

    streamRef.current = stream

    const ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
    audioCtxRef.current = ctx

    // Analyser for waveform
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyserRef.current = analyser

    const source = ctx.createMediaStreamSource(stream)
    sourceRef.current = source
    source.connect(analyser)

    // ScriptProcessorNode to collect raw PCM (deprecated but universally available)
    const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1)
    processorRef.current = processor
    processor.onaudioprocess = (e) => {
      const chunk = e.inputBuffer.getChannelData(0)
      pcmBufferRef.current.push(...Array.from(chunk))
    }
    source.connect(processor)
    processor.connect(ctx.destination)

    pcmBufferRef.current = []
    setStatus('recording')
    setPartialTranscript('')
    rafRef.current = requestAnimationFrame(animateWaveform)
  }, [status, sttModel, animateWaveform, setStatus, setPartialTranscript, setWorkerReady])

  // ── Stop recording & transcribe ─────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (status !== 'recording') return

    cancelAnimationFrame(rafRef.current)
    setWaveformData(new Float32Array(64).fill(0))

    // Tear down audio graph
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    await audioCtxRef.current?.close()

    processorRef.current = null
    sourceRef.current    = null
    analyserRef.current  = null
    streamRef.current    = null
    audioCtxRef.current  = null

    const pcm = pcmBufferRef.current
    pcmBufferRef.current = []

    if (pcm.length < 100) {
      setStatus('idle')
      return
    }

    setStatus('processing')

    try {
      const result = await window.electron?.invoke('voice:transcribe', {
        pcmData: pcm,
        modelSize: sttModel,
        language: sttLanguage,
      }) as { ok: boolean; text?: string; error?: string }

      if (result?.ok && result.text) {
        onTranscript(result.text)
        setPartialTranscript(result.text)
      } else {
        toast.error(`🩸 Transcription failed: ${result?.error ?? 'empty result'}`, {
          style: { background: '#1A0008', border: '1px solid rgba(196,30,58,0.4)', color: '#F5E6E8' }
        })
      }
    } catch (err: any) {
      toast.error(`🩸 Voice worker error: ${err?.message ?? err}`, {
        style: { background: '#1A0008', border: '1px solid rgba(196,30,58,0.4)', color: '#F5E6E8' }
      })
    } finally {
      setStatus('idle')
    }
  }, [status, sttModel, sttLanguage, onTranscript, setStatus, setPartialTranscript, setWaveformData])

  // ── TTS: speak text ─────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!text.trim() || typeof window === 'undefined') return

    // Stop any ongoing speech
    window.speechSynthesis.cancel()

    // Strip markdown for cleaner speech
    const clean = text
      .replace(/```[\s\S]*?```/g, 'code block omitted')
      .replace(/`[^`]+`/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/---+/g, '')
      .trim()

    if (!clean) return

    // Split on sentence boundaries for progressive playback feel
    const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [clean]

    const voices = window.speechSynthesis.getVoices()

    // Voice persona mapping — prefers deeper/dramatic voices
    const voiceMap: Record<string, string[]> = {
      cursed:  ['Microsoft David', 'Google UK English Male', 'Alex', 'en-GB'],
      whisper: ['Google UK English Female', 'Samantha', 'Microsoft Zira'],
      domain:  ['Microsoft Mark', 'Google US English', 'en-US'],
    }
    const preferences = voiceMap[useVoiceStore.getState().ttsVoice] ?? voiceMap.cursed
    const chosen = preferences.reduce<SpeechSynthesisVoice | null>((pick, pref) => {
      if (pick) return pick
      return voices.find((v) => v.name.includes(pref) || v.lang.startsWith(pref)) ?? null
    }, null)

    let idx = 0
    const speakNext = () => {
      if (idx >= sentences.length) {
        setStatus('idle')
        return
      }
      const utt = new SpeechSynthesisUtterance(sentences[idx++])
      utt.rate   = useVoiceStore.getState().ttsSpeed
      utt.pitch  = useVoiceStore.getState().ttsVoice === 'cursed' ? 0.7 : 1.0
      utt.volume = 1.0
      if (chosen) utt.voice = chosen
      utt.onend = speakNext
      utt.onerror = () => setStatus('idle')
      synthRef.current = utt
      window.speechSynthesis.speak(utt)
    }

    setStatus('speaking')
    speakNext()
  }, [setStatus])

  // ── Stop TTS ────────────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setStatus('idle')
  }, [setStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      window.speechSynthesis?.cancel()
    }
  }, [])

  return { startRecording, stopRecording, speak, stopSpeaking }
}
