/**
 * ChatInput — Phase 9 update: Mic button + CursedWaveform + TTS auto-read wire-up.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, Image as ImageIcon, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import CursedButton from '../ui/CursedButton'
import CursedWaveform from './CursedWaveform'
import { useVoice } from '../../hooks/useVoice'
import { useVoiceStore } from '../../stores/voiceStore'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  onAbort: () => void
  isStreaming: boolean
  disabled?: boolean
  /** When set, ChatInput will speak this text automatically (auto-read feature). */
  newAssistantMessage?: string
}

export default function ChatInput({
  onSendMessage,
  onAbort,
  isStreaming,
  disabled,
  newAssistantMessage,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const status    = useVoiceStore((s) => s.status)
  const autoRead  = useVoiceStore((s) => s.autoRead)

  const isRecording  = status === 'recording'
  const isProcessing = status === 'processing'
  const isSpeaking   = status === 'speaking'

  // ── Voice hook ───────────────────────────────────────────────────────────────
  const { startRecording, stopRecording, speak, stopSpeaking } = useVoice({
    onTranscript: (text) => {
      // Append transcript to whatever the user has already typed
      setInput((prev) => (prev ? `${prev} ${text}` : text))
    },
  })

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Auto-read new assistant messages
  useEffect(() => {
    if (autoRead && newAssistantMessage && !isStreaming) {
      speak(newAssistantMessage)
    }
  }, [newAssistantMessage]) // intentional: only trigger on new message arrival

  const handleSubmit = () => {
    if (input.trim() && !isStreaming && !disabled) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      void stopRecording()
    } else if (status === 'idle') {
      void startRecording()
    }
  }, [isRecording, status, startRecording, stopRecording])

  // Mic button label / style
  const micActive = isRecording || isProcessing
  const micTitle  = isRecording  ? 'Stop recording (click to transcribe)'
                  : isProcessing ? 'Transcribing…'
                  : 'Start voice input'

  return (
    <div className="flex flex-col gap-1.5">
      {/* Waveform — shown while recording or processing */}
      {(isRecording || isProcessing) && (
        <div className="flex items-center gap-2 px-1 animate-fadeIn">
          <CursedWaveform active={isRecording} width={220} height={32} />
          {isProcessing && (
            <span className="text-xs text-red-bright animate-pulse font-mono">
              Channeling cursed speech…
            </span>
          )}
        </div>
      )}

      <div className="relative glass-surface p-2 rounded-xl flex items-end gap-2 border border-border-glass">
        {/* Image attach button */}
        <button
          className="p-3 text-text-secondary hover:text-red-bright transition-colors rounded-lg flex-shrink-0"
          title="Attach image"
        >
          <ImageIcon size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Listening…' : isProcessing ? 'Transcribing…' : 'Summon your thoughts…'}
          className="flex-1 bg-transparent border-none focus:outline-none text-text-primary resize-none max-h-[200px] py-3 placeholder:text-text-dim"
          rows={1}
          disabled={isStreaming || disabled || isRecording || isProcessing}
        />

        {/* Mic button */}
        <button
          onClick={handleMicClick}
          disabled={isProcessing || isStreaming || disabled}
          title={micTitle}
          className={[
            'relative p-3 rounded-lg flex-shrink-0 transition-all duration-200',
            micActive
              ? 'text-red-glow bg-red-core/20 border border-red-core/50'
              : 'text-text-secondary hover:text-red-bright hover:bg-red-core/10',
            isProcessing ? 'opacity-60 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          {/* Pulse ring when recording */}
          {isRecording && (
            <span className="absolute inset-0 rounded-lg border border-red-bright/60 animate-ping pointer-events-none" />
          )}
        </button>

        {/* TTS stop / speaking indicator */}
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            title="Stop speaking"
            className="p-3 text-red-bright hover:text-red-glow rounded-lg flex-shrink-0 transition-colors"
          >
            <VolumeX size={20} />
          </button>
        )}

        {/* Send / Abort */}
        {isStreaming ? (
          <CursedButton variant="danger" className="h-11 w-11 !p-0 rounded-lg flex-shrink-0" onClick={onAbort}>
            <Square size={18} fill="currentColor" />
          </CursedButton>
        ) : (
          <CursedButton
            variant="primary"
            className="h-11 w-11 !p-0 rounded-lg flex-shrink-0"
            onClick={handleSubmit}
            disabled={!input.trim() || disabled || isRecording || isProcessing}
          >
            <Send size={18} />
          </CursedButton>
        )}
      </div>
    </div>
  )
}
