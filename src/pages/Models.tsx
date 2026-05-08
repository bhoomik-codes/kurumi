import React, { useEffect, useState } from 'react'
import { useModelStore, LocalModel } from '../stores/modelStore'
import { Brain, Zap, HardDrive, CheckCircle2, Download, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  const gb = bytes / 1e9
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(bytes / 1e6).toFixed(0)} MB`
}

function ModelCard({ model, isActive, onSelect, onDelete }: {
  model: LocalModel
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 overflow-hidden
        ${isActive
          ? 'border-red-core bg-red-core/10 shadow-[0_0_20px_rgba(139,0,0,0.3)]'
          : 'border-border-glass bg-abyss/60 hover:border-red-muted hover:bg-abyss/80'
        }
      `}
    >
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-bright to-transparent" />
      )}

      <div className="p-5 flex items-start gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
          ${isActive ? 'bg-red-core/30 text-red-bright' : 'bg-abyss text-text-secondary'}`}>
          <Brain size={24} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-text-primary font-semibold text-base truncate">{model.name}</h3>
            {isActive && (
              <span className="flex items-center gap-1 text-xs text-red-bright bg-red-core/20 px-2 py-0.5 rounded-full border border-red-core/40">
                <CheckCircle2 size={10} /> Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <HardDrive size={12} />
              {formatBytes(model.size)}
            </span>
            {model.details?.parameter_size && (
              <span className="flex items-center gap-1">
                <Zap size={12} />
                {model.details.parameter_size}
              </span>
            )}
            {model.details?.quantization_level && (
              <span className="text-text-dim">{model.details.quantization_level}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg text-text-dim hover:text-text-secondary hover:bg-white/5 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {!isActive && (
            <button
              onClick={onSelect}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-core/20 text-red-bright border border-red-core/30
                hover:bg-red-core/40 hover:border-red-core/60 transition-all"
            >
              Select
            </button>
          )}

          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-text-dim hover:text-red-bright hover:bg-red-core/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border-glass px-5 py-3 grid grid-cols-2 gap-2 text-xs bg-black/20">
          {[
            ['Family', model.details?.family],
            ['Format', model.details?.format],
            ['Quantization', model.details?.quantization_level],
            ['Parameters', model.details?.parameter_size],
            ['Size', formatBytes(model.size)],
            ['Modified', model.modified_at ? new Date(model.modified_at).toLocaleDateString() : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-text-dim">{label}</span>
              <span className="text-text-secondary">{value || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Models() {
  const { availableModels, activeModel, setAvailableModels, setActiveModel } = useModelStore()
  const [isLoading, setIsLoading] = useState(true)
  const [pullModelName, setPullModelName] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [pullStatus, setPullStatus] = useState('')
  const [pullPercent, setPullPercent] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchModels = async () => {
    setIsLoading(true)
    try {
      const models = await window.electron?.invoke('ollama:models')
      if (models) setAvailableModels(models)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchModels() }, [])

  const handlePull = () => {
    if (!pullModelName.trim() || isPulling) return
    setIsPulling(true)
    setPullPercent(null)
    setPullStatus('Connecting to Ollama...')

    const unsubProgress = window.electron?.on('ollama:pull:progress', (_, data) => {
      setPullStatus(data.status || 'Downloading...')
      if (data.percent !== null && data.percent !== undefined) {
        setPullPercent(data.percent)
      }
    })

    const unsubDone = window.electron?.on('ollama:pull:done', async () => {
      setPullStatus('✓ Model pulled successfully!')
      setPullPercent(100)
      setPullModelName('')
      await fetchModels()
      setIsPulling(false)
      setTimeout(() => { setPullStatus(''); setPullPercent(null) }, 4000)
      if (unsubProgress) unsubProgress()
      if (unsubDone) unsubDone()
      if (unsubError) unsubError()
    })

    const unsubError = window.electron?.on('ollama:pull:error', (_, errMsg) => {
      setPullStatus(`Error: ${errMsg}`)
      setIsPulling(false)
      setPullPercent(null)
      setTimeout(() => setPullStatus(''), 5000)
      if (unsubProgress) unsubProgress()
      if (unsubDone) unsubDone()
      if (unsubError) unsubError()
    })

    window.electron?.send('ollama:pull:start', pullModelName.trim())
  }

  const handleDelete = async (modelName: string) => {
    if (deleteConfirm !== modelName) {
      setDeleteConfirm(modelName)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }
    await window.electron?.invoke('ollama:delete', modelName)
    if (activeModel === modelName) setActiveModel(null)
    await fetchModels()
    setDeleteConfirm(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b border-border-glass glass-deep flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-lg text-text-primary tracking-wide">Local Models</h1>
        <button
          onClick={fetchModels}
          className={`p-2 rounded-lg text-text-secondary hover:text-red-bright hover:bg-red-core/10 transition-all ${isLoading ? 'animate-spin text-red-bright' : ''}`}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Pull a new model */}
          <div className="rounded-xl border border-border-glass bg-abyss/60 p-5">
            <h2 className="text-text-secondary text-sm font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
              <Download size={14} /> Pull New Model
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={pullModelName}
                onChange={(e) => setPullModelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePull()}
                placeholder="e.g. llama3:8b, mistral, phi3:mini"
                className="flex-1 bg-black/30 border border-border-glass rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-red-core/60 transition-colors"
                disabled={isPulling}
              />
              <button
                onClick={handlePull}
                disabled={isPulling || !pullModelName.trim()}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-core/20 text-red-bright border border-red-core/30
                  hover:bg-red-core/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isPulling ? 'Pulling...' : 'Pull'}
              </button>
            </div>
            {pullStatus && (
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <p className={`text-xs ${pullStatus.startsWith('Error') ? 'text-red-400' : pullStatus.startsWith('✓') ? 'text-green-400' : 'text-text-secondary'}`}>
                    {pullStatus}
                  </p>
                  {pullPercent !== null && (
                    <span className="text-xs text-text-dim tabular-nums">{pullPercent}%</span>
                  )}
                </div>
                {isPulling && (
                  <div className="w-full h-1.5 bg-abyss rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-core to-red-bright rounded-full transition-all duration-300"
                      style={{ width: pullPercent !== null ? `${pullPercent}%` : '100%' }}
                    >
                      {pullPercent === null && (
                        <div className="h-full w-1/3 bg-red-glow/60 animate-pulse rounded-full" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Model list */}
          <div>
            <h2 className="text-text-secondary text-sm font-semibold uppercase tracking-widest mb-3">
              Installed Models ({availableModels.length})
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-text-dim gap-3">
                <RefreshCw size={18} className="animate-spin" />
                Scanning local models...
              </div>
            ) : availableModels.length === 0 ? (
              <div className="text-center py-12 text-text-dim">
                <Brain size={40} className="mx-auto mb-3 opacity-30" />
                <p>No models found. Pull one above or run <code className="text-red-muted">ollama pull llama3</code></p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableModels.map(model => (
                  <ModelCard
                    key={model.name}
                    model={model}
                    isActive={activeModel === model.name}
                    onSelect={() => setActiveModel(model.name)}
                    onDelete={() => handleDelete(model.name)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
