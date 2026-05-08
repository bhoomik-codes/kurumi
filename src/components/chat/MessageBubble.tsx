import React from 'react'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  isStreaming?: boolean
}

export default function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user'
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div 
        className={`max-w-[80%] rounded-2xl p-4 relative
          ${isUser 
            ? 'glass-default bg-red-muted/30 border-red-core/50 rounded-tr-sm text-right' 
            : 'glass-deep rounded-tl-sm text-left'
          }
        `}
      >
        {!isUser && (
          <div className="absolute -left-2 top-0 w-1 h-full bg-red-core opacity-50 rounded-full group-hover:opacity-100 transition-opacity" />
        )}
        
        <div className="whitespace-pre-wrap font-sans leading-relaxed text-[15px] text-text-primary">
          {content}
          {isStreaming && role === 'assistant' && (
            <span className="inline-block w-2 h-4 ml-1 bg-red-bright animate-[blink_1s_infinite]" />
          )}
        </div>
      </div>
    </div>
  )
}
