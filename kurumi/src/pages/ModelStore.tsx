import React, { useEffect, useState, useCallback } from 'react'
import { useModelStore } from '../stores/modelStore'
import {
  Search, Download, CheckCircle2, Brain, Zap, HardDrive,
  RefreshCw, X, ExternalLink, TrendingUp, BookOpen, Star, ChevronLeft, ChevronRight
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OllamaModel {
  name: string
  description: string
  pulls: number
  tags: number
  updated: string
}

interface HFModel {
  id: string
  modelId: string
  downloads: number
  likes: number
  tags: string[]
  pipeline_tag?: string
  createdAt: string
}

interface HFFile {
  filename: string
  quant: string
  size?: number
}

// ─── Pull Progress Modal ───────────────────────────────────────────────────────
function PullModal({ tag, displayName, onClose }: { tag: string; displayName: string; onClose: () => void }) {
  const [status, setStatus] = useState('Connecting...')
  const [percent, setPercent] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubs: Array<(() => void) | undefined> = []
    unsubs.push(window.electron?.on('ollama:pull:progress', (_, data) => {
      setStatus(data.status || 'Downloading...')
      if (data.percent != null) setPercent(data.percent)
    }))
    unsubs.push(window.electron?.on('ollama:pull:done', () => {
      setDone(true); setPercent(100); setStatus('Installed successfully!')
    }))
    unsubs.push(window.electron?.on('ollama:pull:error', (_, msg) => setError(msg)))
    window.electron?.send('ollama:pull:start', tag)
    return () => unsubs.forEach(u => u?.())
  }, [tag])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border-glass bg-abyss p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-text-primary font-semibold">{displayName}</h3>
            <p className="text-text-dim text-xs font-mono mt-0.5">{tag}</p>
          </div>
          {(done || error) && (
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-text-dim"><X size={16} /></button>
          )}
        </div>
        {error ? (
          <div className="text-red-400 text-sm space-y-2">
            <p>Error: {error}</p>
            <p className="text-text-dim text-xs">Make sure Ollama is running and you have enough disk space.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-secondary">
              <span className="truncate pr-3">{status}</span>
              {percent != null && <span className="tabular-nums flex-shrink-0">{percent}%</span>}
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-green-500' : 'bg-gradient-to-r from-red-core to-red-bright'}`}
                style={{ width: percent != null ? `${percent}%` : '25%' }}
              >
                {percent == null && <div className="h-full bg-red-glow/50 animate-pulse rounded-full" />}
              </div>
            </div>
            {done && <p className="text-green-400 text-xs flex items-center gap-1.5"><CheckCircle2 size={13} />Ready! Go to Chat and select this model.</p>}
          </div>
        )}
        <button onClick={onClose} className="mt-5 w-full py-2 rounded-lg text-sm border border-border-glass text-text-secondary hover:bg-white/5 transition-colors">
          {done ? 'Close' : 'Run in background'}
        </button>
      </div>
    </div>
  )
}

// ─── HF File Picker Modal ──────────────────────────────────────────────────────
function HFFilePicker({ model, onClose, onInstall, installedTags }: {
  model: HFModel
  onClose: () => void
  onInstall: (tag: string) => void
  installedTags: Set<string>
}) {
  const [files, setFiles] = useState<HFFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    window.electron?.invoke('store:hf:model-files', model.id).then((res: any) => {
      if (res.success) setFiles(res.files)
      else setError(res.error)
      setLoading(false)
    })
  }, [model.id])

  function formatBytes(b?: number) {
    if (!b) return '—'
    return b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(0)} MB`
  }

  const ollamaTag = (f: HFFile) => `hf.co/${model.id}:${f.quant}`
  const isInstalled = (f: HFFile) => installedTags.has(`hf.co/${model.id}`) || installedTags.has(ollamaTag(f))

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border-glass bg-abyss shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-glass">
          <div>
            <h2 className="text-text-primary font-semibold text-sm">{model.id}</h2>
            <a href={`https://huggingface.co/${model.id}`} target="_blank" rel="noreferrer"
              className="text-xs text-red-bright/70 hover:text-red-bright flex items-center gap-1">
              <ExternalLink size={11} /> View on HuggingFace
            </a>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-text-dim"><X size={16} /></button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-text-dim py-6 justify-center">
              <RefreshCw size={16} className="animate-spin" /> Fetching GGUF files...
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : files.length === 0 ? (
            <p className="text-text-dim text-sm text-center py-6">No standalone GGUF files found. Model may be sharded.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-text-dim text-xs mb-3">{files.length} quantization{files.length > 1 ? 's' : ''} available</p>
              {files.map(f => (
                <div key={f.filename} className="flex items-center justify-between rounded-lg border border-border-glass bg-black/20 px-4 py-3">
                  <div>
                    <p className="text-text-primary text-sm font-mono">{f.quant}</p>
                    <p className="text-text-dim text-xs">{formatBytes(f.size)}</p>
                  </div>
                  {isInstalled(f) ? (
                    <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={13} />Installed</span>
                  ) : (
                    <button
                      onClick={() => onInstall(ollamaTag(f))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-core/20 text-red-bright border border-red-core/30 hover:bg-red-core/40 transition-all"
                    >
                      <Download size={13} /> Install
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Ollama Model Card ─────────────────────────────────────────────────────────
function OllamaCard({ model, installedTags, onInstall }: {
  model: OllamaModel; installedTags: Set<string>; onInstall: () => void
}) {
  const isInstalled = installedTags.has(model.name)
  return (
    <div className={`rounded-xl border transition-all duration-200 group overflow-hidden
      ${isInstalled ? 'border-green-800/50 bg-green-950/20' : 'border-border-glass bg-abyss/60 hover:border-red-muted hover:bg-abyss/90'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-text-primary font-semibold text-sm">{model.name}</h3>
          {isInstalled
            ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={12} />Installed</span>
            : <button onClick={onInstall} className="flex items-center gap-1 text-xs text-red-bright/70 hover:text-red-bright transition-colors">
                <Download size={12} /> Install
              </button>
          }
        </div>
        <p className="text-text-secondary text-xs leading-relaxed mb-3 line-clamp-2">{model.description || 'No description available.'}</p>
        <div className="flex items-center gap-4 text-xs text-text-dim">
          {model.pulls > 0 && <span>↓ {model.pulls.toLocaleString()} pulls</span>}
          {model.tags > 0 && <span>🏷 {model.tags} tags</span>}
        </div>
      </div>
    </div>
  )
}

// ─── HuggingFace Model Card ────────────────────────────────────────────────────
function HFCard({ model, installedTags, onSelect }: {
  model: HFModel; installedTags: Set<string>; onSelect: () => void
}) {
  const isInstalled = installedTags.has(`hf.co/${model.id}`) || installedTags.has(model.id)
  const shortId = model.id.split('/').pop() || model.id
  const org = model.id.split('/')[0]

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border transition-all duration-200 cursor-pointer group overflow-hidden
        ${isInstalled ? 'border-green-800/50 bg-green-950/20' : 'border-border-glass bg-abyss/60 hover:border-red-muted hover:bg-abyss/90'}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1 pr-3">
            <h3 className="text-text-primary font-semibold text-sm truncate">{shortId}</h3>
            <p className="text-text-dim text-xs">{org}</p>
          </div>
          {isInstalled
            ? <span className="flex items-center gap-1 text-xs text-green-400 flex-shrink-0"><CheckCircle2 size={12} />Installed</span>
            : <span className="text-xs text-red-bright/60 group-hover:text-red-bright transition-colors flex-shrink-0">Select →</span>
          }
        </div>

        {model.pipeline_tag && (
          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-core/10 text-red-bright/70 border border-red-core/20 mb-2">
            {model.pipeline_tag.replace(/-/g, ' ')}
          </span>
        )}

        <div className="flex items-center gap-4 text-xs text-text-dim mt-2">
          <span className="flex items-center gap-1"><TrendingUp size={10} />{(model.downloads || 0).toLocaleString()}</span>
          <span className="flex items-center gap-1"><Star size={10} />{(model.likes || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const HF_SORTS = [
  { label: 'Most Downloaded', value: 'downloads' },
  { label: 'Most Liked', value: 'likes' },
  { label: 'Newest', value: 'createdAt' },
  { label: 'Last Modified', value: 'lastModified' },
]

export default function ModelStore() {
  const { availableModels, setAvailableModels } = useModelStore()
  const [activeTab, setActiveTab] = useState<'ollama' | 'huggingface'>('ollama')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hfSort, setHfSort] = useState('downloads')

  // Results
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [hfModels, setHfModels] = useState<HFModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modals
  const [pullTag, setPullTag] = useState<{ tag: string; name: string } | null>(null)
  const [hfPicker, setHfPicker] = useState<HFModel | null>(null)
  const [ollamaInstall, setOllamaInstall] = useState<OllamaModel | null>(null)

  const installedTags = new Set<string>([
    ...availableModels.map(m => m.name),
    ...availableModels.map(m => m.name.split(':')[0])
  ])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(0) }, [debouncedSearch, activeTab, hfSort])

  // Fetch installed models
  useEffect(() => {
    window.electron?.invoke('ollama:models').then((m: any) => { if (m) setAvailableModels(m) })
  }, [pullTag])

  const fetchOllama = useCallback(async () => {
    setLoading(true); setError('')
    const res = await window.electron?.invoke('store:ollama:search', { query: debouncedSearch, page: page + 1 })
    if (res?.success) setOllamaModels(res.models)
    else setError(res?.error || 'Failed to load Ollama library')
    setLoading(false)
  }, [debouncedSearch, page])

  const fetchHF = useCallback(async () => {
    setLoading(true); setError('')
    const res = await window.electron?.invoke('store:hf:search', { query: debouncedSearch, sort: hfSort, limit: 24, page })
    if (res?.success) setHfModels(res.models)
    else setError(res?.error || 'Failed to load HuggingFace models')
    setLoading(false)
  }, [debouncedSearch, hfSort, page])

  useEffect(() => {
    if (activeTab === 'ollama') fetchOllama()
    else fetchHF()
  }, [activeTab, fetchOllama, fetchHF])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b border-border-glass glass-deep flex items-center gap-3 px-6 flex-shrink-0">
        <h1 className="font-display text-base text-text-primary tracking-wide flex-shrink-0">Model Store</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-black/30 rounded-lg p-1 flex-shrink-0">
          {(['ollama', 'huggingface'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${activeTab === tab ? 'bg-red-core/40 text-red-bright' : 'text-text-dim hover:text-text-secondary'}`}
            >
              {tab === 'ollama' ? '🦙 Ollama Library' : '🤗 HuggingFace'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'ollama' ? 'Search Ollama library...' : 'Search HuggingFace GGUF models...'}
            className="w-full bg-black/30 border border-border-glass rounded-lg pl-8 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-red-core/50 transition-colors"
          />
        </div>

        {/* HF Sort */}
        {activeTab === 'huggingface' && (
          <select
            value={hfSort}
            onChange={e => setHfSort(e.target.value)}
            className="bg-black/30 border border-border-glass rounded-lg px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-red-core/50"
          >
            {HF_SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}

        <button onClick={activeTab === 'ollama' ? fetchOllama : fetchHF}
          className={`p-2 rounded-lg text-text-dim hover:text-red-bright transition-colors ${loading ? 'animate-spin text-red-bright' : ''}`}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-3 text-text-dim">
            <RefreshCw size={20} className="animate-spin" />
            <span>Fetching models from {activeTab === 'ollama' ? 'ollama.com' : 'huggingface.co'}...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-text-dim">
            <Brain size={40} className="opacity-30" />
            <p className="text-sm">{error}</p>
            <button onClick={activeTab === 'ollama' ? fetchOllama : fetchHF}
              className="text-xs text-red-bright/70 hover:text-red-bright">Retry</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 mb-6">
              {activeTab === 'ollama'
                ? ollamaModels.map(m => (
                    <OllamaCard
                      key={m.name}
                      model={m}
                      installedTags={installedTags}
                      onInstall={() => {
                        // For Ollama models, install the base tag — user can choose variant later
                        setPullTag({ tag: m.name, name: m.name })
                      }}
                    />
                  ))
                : hfModels.map(m => (
                    <HFCard
                      key={m.id}
                      model={m}
                      installedTags={installedTags}
                      onSelect={() => setHfPicker(m)}
                    />
                  ))
              }
            </div>

            {/* Pagination */}
            {((activeTab === 'ollama' && ollamaModels.length > 0) || (activeTab === 'huggingface' && hfModels.length > 0)) && (
              <div className="flex items-center justify-center gap-4 text-sm">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-glass text-text-secondary hover:text-red-bright hover:border-red-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-text-dim text-xs">Page {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-glass text-text-secondary hover:text-red-bright hover:border-red-muted transition-colors">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* HuggingFace quantization picker */}
      {hfPicker && (
        <HFFilePicker
          model={hfPicker}
          installedTags={installedTags}
          onClose={() => setHfPicker(null)}
          onInstall={(tag) => { setHfPicker(null); setPullTag({ tag, name: tag }) }}
        />
      )}

      {/* Pull progress modal */}
      {pullTag && (
        <PullModal tag={pullTag.tag} displayName={pullTag.name} onClose={() => setPullTag(null)} />
      )}
    </div>
  )
}
