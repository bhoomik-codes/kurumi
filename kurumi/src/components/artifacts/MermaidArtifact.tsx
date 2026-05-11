import React, { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { Copy, Check, Eye, Code, ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { CodeArtifact } from './CodeArtifact'
import { v4 as uuidv4 } from 'uuid'

export function MermaidArtifact({ language, code }: { language: string; code: string }) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(`mermaid-${uuidv4().substring(0, 8)}`)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (viewMode !== 'preview') return

    let isMounted = true

    const renderMermaid = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#8B0000',
            primaryTextColor: '#fff',
            primaryBorderColor: '#FF2244',
            lineColor: '#FF2244',
            secondaryColor: '#5C1A2A',
            tertiaryColor: '#1a050a'
          },
          fontFamily: "'Nunito', sans-serif"
        })

        const { svg } = await mermaid.render(idRef.current, code)
        if (isMounted) {
          setSvgContent(svg)
          setError(null)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to render diagram')
          setSvgContent(null)
        }
      }
    }

    renderMermaid()

    return () => {
      isMounted = false
    }
  }, [code, viewMode])

  return (
    <div className="relative group/artifact my-4 rounded-xl overflow-hidden border border-border-glass bg-abyss flex flex-col shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-glass bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-dim font-mono uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Mermaid Diagram
          </span>
          <div className="flex items-center bg-white/5 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 text-[11px] rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'preview' ? 'bg-white/10 text-white' : 'text-text-dim hover:text-white'
              }`}
            >
              <Eye size={12} /> Diagram
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-2 py-1 text-[11px] rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'code' ? 'bg-white/10 text-white' : 'text-text-dim hover:text-white'
              }`}
            >
              <Code size={12} /> Source
            </button>
          </div>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-text-dim hover:text-red-bright transition-colors"
        >
          {copied ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} /> Copy Source</>}
        </button>
      </div>

      <div className="relative w-full bg-black/20 overflow-hidden min-h-[200px]">
        {viewMode === 'preview' ? (
          <div className="p-6 overflow-auto custom-scrollbar flex items-center justify-center min-h-[300px]">
            {error ? (
              <div className="text-red-400 text-sm font-mono p-4 bg-red-900/20 rounded border border-red-900/50">
                {error}
              </div>
            ) : svgContent ? (
              <div 
                ref={containerRef}
                dangerouslySetInnerHTML={{ __html: svgContent }} 
                className="mermaid-wrapper flex justify-center w-full"
              />
            ) : (
              <div className="text-text-dim text-sm animate-pulse">Rendering diagram...</div>
            )}
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <CodeArtifact language={language} code={code} />
          </div>
        )}
      </div>
    </div>
  )
}
