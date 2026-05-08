import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { Copy, Check } from 'lucide-react'

// ─── Custom code block with copy button ──────────────────────────────────────
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Cursed Blood dark theme for code
  const cursedTheme: { [key: string]: React.CSSProperties } = {
    'code[class*="language-"]': { color: '#e2c4f0', background: 'transparent', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '13px', lineHeight: '1.6' },
    'pre[class*="language-"]': { background: 'transparent' },
    comment: { color: '#6b5b6e' },
    prolog: { color: '#6b5b6e' },
    doctype: { color: '#6b5b6e' },
    cdata: { color: '#6b5b6e' },
    punctuation: { color: '#b98fc4' },
    property: { color: '#ff6b9d' },
    tag: { color: '#ff6b9d' },
    boolean: { color: '#ff4d7f' },
    number: { color: '#ff8c42' },
    constant: { color: '#ff8c42' },
    symbol: { color: '#ff8c42' },
    deleted: { color: '#ff4d4d' },
    selector: { color: '#a8ff78' },
    'attr-name': { color: '#f9ca24' },
    string: { color: '#a8ff78' },
    char: { color: '#a8ff78' },
    builtin: { color: '#a8ff78' },
    inserted: { color: '#a8ff78' },
    operator: { color: '#d4a5f5' },
    entity: { color: '#f9ca24', cursor: 'help' },
    url: { color: '#a8ff78' },
    variable: { color: '#e2c4f0' },
    atrule: { color: '#ff6b9d' },
    'attr-value': { color: '#a8ff78' },
    function: { color: '#74b9ff' },
    'class-name': { color: '#fdcb6e' },
    keyword: { color: '#c471ed' },
    regex: { color: '#ff8c42' },
    important: { color: '#ff4d4d', fontWeight: 'bold' },
    bold: { fontWeight: 'bold' },
    italic: { fontStyle: 'italic' },
  }

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-white/10 bg-black/40">
      {/* Language badge + copy button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/30">
        <span className="text-[11px] text-text-dim font-mono uppercase tracking-widest">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-text-dim hover:text-red-bright transition-colors"
        >
          {copied ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language || 'text'}
          style={cursedTheme}
          customStyle={{ margin: 0, padding: '14px 16px', background: 'transparent' }}
          showLineNumbers={code.split('\n').length > 5}
          lineNumberStyle={{ color: '#3d2d45', fontSize: '12px', paddingRight: '16px', userSelect: 'none' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

// ─── Main Markdown Renderer ───────────────────────────────────────────────────
interface MarkdownRendererProps {
  content: string
  isStreaming?: boolean
}

export default function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ── Code blocks ──────────────────────────────────────────
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !className && !String(children).includes('\n')

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-[13px] bg-red-core/20 text-red-bright font-mono border border-red-core/20"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <CodeBlock
                language={match?.[1] || ''}
                code={String(children).replace(/\n$/, '')}
              />
            )
          },

          // ── Headings ─────────────────────────────────────────────
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-text-primary mt-5 mb-3 pb-2 border-b border-border-glass">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-text-primary mt-4 mb-2.5 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-core rounded-full inline-block flex-shrink-0" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-text-secondary mt-3 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-text-secondary mt-2 mb-1">{children}</h4>
          ),

          // ── Paragraph ────────────────────────────────────────────
          p: ({ children }) => (
            <p className="text-[15px] text-text-primary leading-relaxed mb-3 last:mb-0">{children}</p>
          ),

          // ── Lists ────────────────────────────────────────────────
          ul: ({ children }) => (
            <ul className="my-2 pl-5 space-y-1 list-none">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 pl-5 space-y-1 list-decimal marker:text-red-bright/60">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[15px] text-text-primary leading-relaxed flex gap-2 items-start">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-core/60 flex-shrink-0" />
              <span>{children}</span>
            </li>
          ),

          // ── Blockquote ───────────────────────────────────────────
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-red-core/60 pl-4 my-3 italic text-text-secondary bg-red-core/5 py-2 rounded-r-lg">
              {children}
            </blockquote>
          ),

          // ── Table ────────────────────────────────────────────────
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-border-glass">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-red-core/10 border-b border-border-glass">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-[14px] text-text-primary border-b border-border-glass/50 last:border-0">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>
          ),

          // ── Horizontal rule ──────────────────────────────────────
          hr: () => (
            <hr className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-border-glass to-transparent" />
          ),

          // ── Strong / Em ──────────────────────────────────────────
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-text-secondary">{children}</em>
          ),

          // ── Links ────────────────────────────────────────────────
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-red-bright underline underline-offset-2 hover:text-red-glow transition-colors"
            >
              {children}
            </a>
          ),

          // ── Images ───────────────────────────────────────────────
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="rounded-lg max-w-full my-2 border border-border-glass" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Blinking cursor during stream */}
      {isStreaming && content && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-red-bright animate-pulse rounded-sm align-middle" />
      )}
    </div>
  )
}
