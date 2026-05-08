import React, { useState, useRef, useEffect } from 'react'
import { Send, Square, Image as ImageIcon } from 'lucide-react'
import CursedButton from '../ui/CursedButton'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  onAbort: () => void
  isStreaming: boolean
  disabled?: boolean
}

export default function ChatInput({ onSendMessage, onAbort, isStreaming, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

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

  return (
    <div className="relative glass-surface p-2 rounded-xl flex items-end gap-2 border border-border-glass">
      <button className="p-3 text-text-secondary hover:text-red-bright transition-colors rounded-lg">
        <ImageIcon size={20} />
      </button>

      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Summon your thoughts..."
        className="flex-1 bg-transparent border-none focus:outline-none text-text-primary resize-none max-h-[200px] py-3 placeholder:text-text-dim"
        rows={1}
        disabled={isStreaming || disabled}
      />

      {isStreaming ? (
        <CursedButton variant="danger" className="h-11 w-11 !p-0 rounded-lg" onClick={onAbort}>
          <Square size={18} fill="currentColor" />
        </CursedButton>
      ) : (
        <CursedButton 
          variant="primary" 
          className="h-11 w-11 !p-0 rounded-lg" 
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
        >
          <Send size={18} />
        </CursedButton>
      )}
    </div>
  )
}
