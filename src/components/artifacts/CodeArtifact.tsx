import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { Copy, Check, Play } from 'lucide-react'

export function CodeArtifact({ language, code }: { language: string; code: string }) {
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
