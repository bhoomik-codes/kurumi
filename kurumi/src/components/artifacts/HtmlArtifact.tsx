import React, { useRef, useState, useEffect } from 'react'
import { Copy, Check, Eye, Code } from 'lucide-react'
import { CodeArtifact } from './CodeArtifact'

export function HtmlArtifact({ language, code }: { language: string; code: string }) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Inject a base style to handle dark mode so previews don't look completely white unless specified
  const injectedCode = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { 
            margin: 0; 
            padding: 1rem; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #ffffff;
            /* Optional: Make background inherit from parent, or set a neutral dark */
          }
        </style>
      </head>
      <body>
        ${code}
      </body>
    </html>
  `

  return (
    <div className="relative group/artifact my-4 rounded-xl overflow-hidden border border-border-glass bg-abyss flex flex-col shadow-lg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-glass bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-dim font-mono uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            HTML Preview
          </span>
          <div className="flex items-center bg-white/5 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 text-[11px] rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'preview' ? 'bg-white/10 text-white' : 'text-text-dim hover:text-white'
              }`}
            >
              <Eye size={12} /> Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-2 py-1 text-[11px] rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'code' ? 'bg-white/10 text-white' : 'text-text-dim hover:text-white'
              }`}
            >
              <Code size={12} /> Code
            </button>
          </div>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-text-dim hover:text-red-bright transition-colors"
        >
          {copied ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} /> Copy Code</>}
        </button>
      </div>

      {/* Content */}
      <div className="relative min-h-[150px] w-full bg-[#111] overflow-hidden">
        {viewMode === 'preview' ? (
          <iframe
            ref={iframeRef}
            srcDoc={injectedCode}
            sandbox="allow-scripts"
            className="w-full h-full min-h-[300px] border-none bg-white"
            title="HTML Preview"
          />
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <CodeArtifact language={language} code={code} />
          </div>
        )}
      </div>
    </div>
  )
}
