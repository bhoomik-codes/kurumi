import React, { useState } from 'react'
import { Copy, Check, Eye, Code, RefreshCw } from 'lucide-react'
import { CodeArtifact } from './CodeArtifact'

export function ReactArtifact({ language, code }: { language: string; code: string }) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // To properly sandbox React, we use a srcDoc iframe.
  // In a full offline environment, these CDN links would be replaced by local assets served via an IPC protocol.
  // We use Babel standalone to transpile the JSX in the browser inside the sandbox.
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { 
            margin: 0; 
            padding: 1rem; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #ffffff;
            color: #1a1a1a;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          try {
            ${code}
            
            // Auto-mount the default export or a component named App
            let ComponentToMount = null;
            if (typeof App !== 'undefined') ComponentToMount = App;
            else if (typeof defaultExport !== 'undefined') ComponentToMount = defaultExport;
            
            if (ComponentToMount) {
              const root = ReactDOM.createRoot(document.getElementById('root'));
              root.render(React.createElement(ComponentToMount));
            } else {
              document.getElementById('root').innerHTML = '<div style="color:red;padding:1rem;">Error: No component named App found to mount.</div>';
            }
          } catch (err) {
            document.getElementById('root').innerHTML = '<div style="color:red;padding:1rem;font-family:monospace;">' + err.toString() + '</div>';
          }
        </script>
      </body>
    </html>
  `

  return (
    <div className="relative group/artifact my-4 rounded-xl overflow-hidden border border-border-glass bg-abyss flex flex-col shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-glass bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-dim font-mono uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            React Artifact
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
        
        <div className="flex items-center gap-2">
          {viewMode === 'preview' && (
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="flex items-center gap-1 text-[11px] text-text-dim hover:text-white transition-colors mr-2"
              title="Reload Component"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-text-dim hover:text-red-bright transition-colors"
          >
            {copied ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} /> Copy Code</>}
          </button>
        </div>
      </div>

      <div className="relative min-h-[300px] w-full bg-[#f8f9fa] overflow-hidden">
        {viewMode === 'preview' ? (
          <iframe
            key={refreshKey}
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="w-full h-[400px] border-none"
            title="React Preview"
          />
        ) : (
          <div className="max-h-[500px] overflow-y-auto bg-black/40">
            <CodeArtifact language={language} code={code} />
          </div>
        )}
      </div>
    </div>
  )
}
