import React, { useEffect, useState, useMemo } from 'react'
import { useModelStore } from '../stores/modelStore'
import { MODEL_STORE, CATEGORIES, StoreModel, ModelCategory } from '../data/modelRegistry'
import {
  Search, Download, CheckCircle2, Brain, Zap, HardDrive, 
  Cpu, Filter, Star, ChevronDown, ChevronUp, X, BookOpen
} from 'lucide-react'

// ─── Filters ────────────────────────────────────────────────────────────────
const RAM_FILTERS = [
  { label: 'Any', max: Infinity },
  { label: '≤ 4 GB', max: 4 },
  { label: '≤ 8 GB', max: 8 },
  { label: '≤ 16 GB', max: 16 },
  { label: '≤ 32 GB', max: 32 },
]

// ─── Pull Modal ──────────────────────────────────────────────────────────────
function PullModal({ model, variant, onClose }: {
  model: StoreModel
  variant: { tag: string; params: string; ramGB: number; sizeGB: number }
  onClose: () => void
}) {
  const [status, setStatus] = useState('Connecting to Ollama...')
  const [percent, setPercent] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubs: Array<(() => void) | undefined> = []

    const u1 = window.electron?.on('ollama:pull:progress', (_, data) => {
      setStatus(data.status || 'Downloading...')
      if (data.percent !== null && data.percent !== undefined) setPercent(data.percent)
    })
    const u2 = window.electron?.on('ollama:pull:done', () => {
      setDone(true)
      setPercent(100)
      setStatus('Installed successfully!')
    })
    const u3 = window.electron?.on('ollama:pull:error', (_, msg) => {
      setError(msg)
    })

    unsubs.push(u1, u2, u3)
    window.electron?.send('ollama:pull:start', variant.tag)

    return () => unsubs.forEach(u => u?.())
  }, [variant.tag])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border-glass bg-abyss p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-text-primary font-semibold text-lg">{model.displayName}</h3>
            <p className="text-text-secondary text-sm">{variant.params} · {variant.sizeGB} GB download</p>
          </div>
          {done && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-text-dim">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Progress */}
        {!error ? (
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-text-secondary">
              <span className="truncate pr-4">{status}</span>
              {percent !== null && <span className="tabular-nums flex-shrink-0">{percent}%</span>}
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
              {done ? (
                <div className="h-full bg-green-500 rounded-full" />
              ) : (
                <div
                  className="h-full bg-gradient-to-r from-red-core to-red-bright rounded-full transition-all duration-300"
                  style={{ width: percent !== null ? `${percent}%` : '30%' }}
                >
                  {percent === null && (
                    <div className="h-full bg-red-glow/50 animate-pulse rounded-full" />
                  )}
                </div>
              )}
            </div>

            {done && (
              <div className="flex items-center gap-2 text-green-400 text-sm mt-2">
                <CheckCircle2 size={16} />
                Model is ready to use! Go to Chat and select it.
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-400 text-sm space-y-3">
            <p>Error: {error}</p>
            <p className="text-text-dim text-xs">Make sure Ollama is running and you have enough disk space.</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-lg text-sm border border-border-glass text-text-secondary hover:bg-white/5 transition-colors"
        >
          {done ? 'Close' : 'Run in background'}
        </button>
      </div>
    </div>
  )
}

// ─── Model Detail Modal ───────────────────────────────────────────────────────
function ModelDetailModal({ model, installedTags, onClose, onInstall }: {
  model: StoreModel
  installedTags: Set<string>
  onClose: () => void
  onInstall: (variant: StoreModel['variants'][0]) => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-border-glass bg-abyss shadow-2xl overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-glass">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-core/20 flex items-center justify-center text-red-bright">
              <Brain size={20} />
            </div>
            <div>
              <h2 className="text-text-primary font-semibold">{model.displayName}</h2>
              <p className="text-text-dim text-xs">{model.developer} · {model.license}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-text-dim">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Description */}
          <p className="text-text-secondary text-sm leading-relaxed">{model.longDescription}</p>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <BookOpen size={14} />, label: 'Context', value: `${(model.contextWindow / 1000).toFixed(0)}K tokens` },
              { icon: <Zap size={14} />, label: 'License', value: model.license },
              { icon: <Cpu size={14} />, label: 'Developer', value: model.developer },
            ].map(({ icon, label, value }) => (
              <div key={label} className="rounded-lg bg-black/30 border border-border-glass p-3">
                <div className="flex items-center gap-1.5 text-text-dim text-xs mb-1">{icon}{label}</div>
                <p className="text-text-secondary text-sm font-medium truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {model.tags.map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-red-core/10 text-red-bright/80 border border-red-core/20">{t}</span>
            ))}
          </div>

          {/* Variants */}
          <div>
            <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">Available Versions</h3>
            <div className="space-y-2">
              {model.variants.map(v => {
                const isInstalled = installedTags.has(v.tag.split(':')[0]) || installedTags.has(v.tag)
                return (
                  <div key={v.tag} className="flex items-center justify-between rounded-lg border border-border-glass bg-black/20 px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span className="text-text-primary font-semibold text-sm w-14">{v.params}</span>
                      <div className="flex items-center gap-3 text-xs text-text-dim">
                        <span className="flex items-center gap-1"><HardDrive size={11} />{v.sizeGB} GB</span>
                        <span className="flex items-center gap-1"><Cpu size={11} />≥ {v.ramGB} GB RAM</span>
                      </div>
                    </div>
                    {isInstalled ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle2 size={14} />Installed</span>
                    ) : (
                      <button
                        onClick={() => onInstall(v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                          bg-red-core/20 text-red-bright border border-red-core/30 hover:bg-red-core/40 transition-all"
                      >
                        <Download size={13} /> Install
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Model Store Card ─────────────────────────────────────────────────────────
function StoreCard({ model, installedTags, onDetail }: {
  model: StoreModel
  installedTags: Set<string>
  onDetail: () => void
}) {
  const isAnyInstalled = model.variants.some(v => installedTags.has(v.tag.split(':')[0]) || installedTags.has(v.tag))
  const minRam = Math.min(...model.variants.map(v => v.ramGB))
  const minSize = Math.min(...model.variants.map(v => v.sizeGB))

  return (
    <div
      onClick={onDetail}
      className={`relative rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden group
        ${isAnyInstalled
          ? 'border-green-800/50 bg-green-950/20 hover:border-green-700/60'
          : 'border-border-glass bg-abyss/60 hover:border-red-muted hover:bg-abyss/90'
        }
      `}
    >
      {model.featured && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-900/30 border border-amber-700/30 px-2 py-0.5 rounded-full">
            <Star size={9} fill="currentColor" /> Featured
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg
            ${isAnyInstalled ? 'bg-green-900/30' : 'bg-red-core/15'}`}
          >
            {model.category.includes('vision') ? '👁️'
              : model.category.includes('coding') ? '💻'
              : model.category.includes('embeddings') ? '📦'
              : model.category.includes('reasoning') ? '🧠'
              : model.category.includes('fast') ? '⚡'
              : '💬'}
          </div>
          <div className="min-w-0 flex-1 pr-16">
            <h3 className="text-text-primary font-semibold text-sm truncate">{model.displayName}</h3>
            <p className="text-text-dim text-xs">{model.developer}</p>
          </div>
        </div>

        <p className="text-text-secondary text-xs leading-relaxed mb-4 line-clamp-2">{model.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-text-dim">
            <span className="flex items-center gap-1"><HardDrive size={10} />from {minSize} GB</span>
            <span className="flex items-center gap-1"><Cpu size={10} />≥ {minRam} GB RAM</span>
          </div>

          {isAnyInstalled ? (
            <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={12} />Installed</span>
          ) : (
            <span className="text-xs text-red-bright/70 group-hover:text-red-bright transition-colors">
              {model.variants.length} version{model.variants.length > 1 ? 's' : ''} →
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ModelStore() {
  const { availableModels, setAvailableModels } = useModelStore()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ModelCategory | 'all'>('all')
  const [maxRam, setMaxRam] = useState(Infinity)
  const [showFilters, setShowFilters] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [detailModel, setDetailModel] = useState<StoreModel | null>(null)
  const [pullingModel, setPullingModel] = useState<{ model: StoreModel; variant: StoreModel['variants'][0] } | null>(null)

  // Fetch installed models
  useEffect(() => {
    window.electron?.invoke('ollama:models').then((models) => {
      if (models) setAvailableModels(models)
    })
  }, [pullingModel]) // re-fetch after pull closes

  const installedTags = useMemo(() => {
    const s = new Set<string>()
    availableModels.forEach(m => {
      s.add(m.name)
      s.add(m.name.split(':')[0])
    })
    return s
  }, [availableModels])

  const filtered = useMemo(() => {
    return MODEL_STORE.filter(m => {
      if (activeCategory !== 'all' && !m.category.includes(activeCategory)) return false
      if (featuredOnly && !m.featured) return false
      if (maxRam !== Infinity) {
        const hasAffordableVariant = m.variants.some(v => v.ramGB <= maxRam)
        if (!hasAffordableVariant) return false
      }
      if (search) {
        const q = search.toLowerCase()
        return m.displayName.toLowerCase().includes(q)
          || m.developer.toLowerCase().includes(q)
          || m.description.toLowerCase().includes(q)
          || m.tags.some(t => t.toLowerCase().includes(q))
      }
      return true
    })
  }, [search, activeCategory, maxRam, featuredOnly])

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="h-14 border-b border-border-glass glass-deep flex items-center gap-4 px-6 flex-shrink-0">
        <h1 className="font-display text-lg text-text-primary tracking-wide flex-shrink-0">Model Store</h1>
        <div className="flex-1 relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full bg-black/30 border border-border-glass rounded-lg pl-9 pr-4 py-1.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-red-core/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors
            ${showFilters ? 'border-red-core/60 bg-red-core/15 text-red-bright' : 'border-border-glass text-text-secondary hover:border-red-muted'}`}
        >
          <Filter size={14} /> Filters
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="border-b border-border-glass bg-abyss/80 px-6 py-3 flex items-center gap-6 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-dim">RAM:</span>
            <div className="flex gap-1">
              {RAM_FILTERS.map(f => (
                <button
                  key={f.label}
                  onClick={() => setMaxRam(f.max)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${maxRam === f.max
                    ? 'bg-red-core/30 border-red-core/60 text-red-bright'
                    : 'border-border-glass text-text-dim hover:border-red-muted'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setFeaturedOnly(f => !f)}
              className={`w-8 h-4 rounded-full transition-colors relative ${featuredOnly ? 'bg-red-core' : 'bg-white/10'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${featuredOnly ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="text-xs text-text-secondary">Featured only</span>
          </label>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-border-glass bg-abyss/40 overflow-y-auto py-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors
                ${activeCategory === cat.id
                  ? 'bg-red-core/20 text-red-bright border-r-2 border-red-bright'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
            >
              <span>{cat.emoji}</span>
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-text-dim text-sm">{filtered.length} model{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-text-dim gap-3">
              <Brain size={40} className="opacity-30" />
              <p>No models match your filters.</p>
              <button onClick={() => { setSearch(''); setActiveCategory('all'); setMaxRam(Infinity); setFeaturedOnly(false) }}
                className="text-xs text-red-bright/70 hover:text-red-bright">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {filtered.map(model => (
                <StoreCard
                  key={model.id}
                  model={model}
                  installedTags={installedTags}
                  onDetail={() => setDetailModel(model)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detailModel && (
        <ModelDetailModal
          model={detailModel}
          installedTags={installedTags}
          onClose={() => setDetailModel(null)}
          onInstall={(variant) => {
            setDetailModel(null)
            setPullingModel({ model: detailModel, variant })
          }}
        />
      )}

      {/* Pull Progress Modal */}
      {pullingModel && (
        <PullModal
          model={pullingModel.model}
          variant={pullingModel.variant}
          onClose={() => setPullingModel(null)}
        />
      )}
    </div>
  )
}
