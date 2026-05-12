import React, { useState, useEffect, useRef } from 'react'
import { Copy, Check, Eye, Code, RefreshCw } from 'lucide-react'
import { CodeArtifact } from './CodeArtifact'

// ── Offline React Artifact ─────────────────────────────────────────────────────
// UMD bundles (react, react-dom, @babel/standalone) are copied into
// public/sandbox/ at build time. We fetch() them as plain static assets —
// no Vite exports-map inspection, works in both dev and Electron prod builds.
// React 18+ removed ./umd/* from its package.json exports map, so dynamic
// import('react/umd/...') fails at Vite's import-analysis stage; fetch() bypasses that.

async function loadInlineScripts(): Promise<{ react: string; reactDom: string; babel: string }> {
  const [reactRaw, reactDomRaw, babelRaw] = await Promise.all([
    fetch('/sandbox/react.development.js').then(r => r.text()),
    fetch('/sandbox/react-dom.development.js').then(r => r.text()),
    fetch('/sandbox/babel.min.js').then(r => r.text()),
  ])
  return { react: reactRaw, reactDom: reactDomRaw, babel: babelRaw }
}

const SCRIPT_CACHE = { loaded: false, react: '', reactDom: '', babel: '' }

export function ReactArtifact({ language, code }: { language: string; code: string }) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    let cancelled = false

    async function buildSrcDoc() {
      try {
        if (!SCRIPT_CACHE.loaded) {
          const scripts = await loadInlineScripts()
          SCRIPT_CACHE.react = scripts.react
          SCRIPT_CACHE.reactDom = scripts.reactDom
          SCRIPT_CACHE.babel = scripts.babel
          SCRIPT_CACHE.loaded = true
        }

        if (cancelled) return

        // Build a fully self-contained HTML page with the user's component
        const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {
      margin: 0;
      padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
    }
    *, *::before, *::after { box-sizing: border-box; }
  </style>
  <script>${SCRIPT_CACHE.react}</script>
  <script>${SCRIPT_CACHE.reactDom}</script>
  <script>${SCRIPT_CACHE.babel}</script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${code}

      // Mount: look for component named "App" or "default"
      const ComponentToMount =
        typeof App !== 'undefined' ? App :
        typeof Default !== 'undefined' ? Default : null;

      if (!ComponentToMount) {
        document.getElementById('root').innerHTML =
          '<div style="color:crimson;padding:1rem;font-family:monospace;">No component named <b>App</b> found to mount. Make sure your component is named <b>App</b>.</div>';
      } else {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(ComponentToMount));
      }
    } catch (err) {
      document.getElementById('root').innerHTML =
        '<div style="color:crimson;padding:1rem;font-family:monospace;white-space:pre-wrap;"><b>Runtime Error:</b>\\n' + err.toString() + '</div>';
    }
  </script>
</body>
</html>`
        setSrcDoc(doc)
        setLoadError(null)
      } catch (err: any) {
        if (!cancelled) setLoadError(`Failed to load runtime: ${err.message}`)
      }
    }

    buildSrcDoc()
    return () => { cancelled = true }
  }, [code, refreshKey])

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
            {copied
              ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
              : <><Copy size={12} /> Copy Code</>}
          </button>
        </div>
      </div>

      <div className="relative min-h-[300px] w-full bg-white overflow-hidden">
        {viewMode === 'preview' ? (
          loadError ? (
            <div className="p-4 text-red-400 text-sm font-mono">{loadError}</div>
          ) : srcDoc ? (
            <iframe
              key={refreshKey}
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              className="w-full h-[400px] border-none"
              title="React Preview"
            />
          ) : (
            <div className="p-4 text-text-dim text-sm animate-pulse">Building sandbox…</div>
          )
        ) : (
          <div className="max-h-[500px] overflow-y-auto bg-black/40">
            <CodeArtifact language={language} code={code} />
          </div>
        )}
      </div>
    </div>
  )
}
