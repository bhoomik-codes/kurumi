import React from 'react'
import MarkdownRenderer from './MarkdownRenderer'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  isStreaming?: boolean
  metadata?: any
}

export default function MessageBubble({ role, content, isStreaming, metadata }: MessageBubbleProps) {
  const isUser = role === 'user'
  const sources = Array.isArray(metadata?.sources) ? metadata.sources : []

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-red-core/20 border border-red-core/40 flex items-center justify-center flex-shrink-0 mt-1 mr-3 text-xs">
          🩸
        </div>
      )}

      <div
        className={`relative rounded-2xl p-4
          ${isUser
            ? 'max-w-[75%] glass-default bg-red-muted/30 border-red-core/50 rounded-tr-sm'
            : 'flex-1 glass-deep rounded-tl-sm'
          }
        `}
      >
        {/* Left accent bar for assistant */}
        {!isUser && (
          <div className="absolute -left-px top-2 bottom-2 w-0.5 bg-red-core opacity-40 rounded-full group-hover:opacity-80 transition-opacity" />
        )}

        {/* Loading state */}
        {!content && isStreaming ? (
          <div className="flex items-center gap-2 text-text-secondary italic text-sm">
            <span className="w-2 h-2 rounded-full bg-red-glow animate-ping" />
            Summoning from the void...
          </div>
        ) : isUser ? (
          // User messages: plain text, right-aligned
          <p className="text-[15px] text-text-primary leading-relaxed whitespace-pre-wrap text-right">
            {content}
          </p>
        ) : (
          // Assistant messages: full Markdown rendering
          <>
            <MarkdownRenderer content={content} isStreaming={isStreaming} />
            {sources.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-vein/40 bg-red-core/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-red-bright mb-1">Sources</p>
                <ul className="text-xs text-text-secondary space-y-1">
                  {sources.map((s: any, idx: number) => (
                    <li key={`${s.filename}-${s.chunk_index}-${idx}`}>
                      {s.filename} (chunk {s.chunk_index})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
