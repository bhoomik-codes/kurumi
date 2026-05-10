import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useModelStore } from '../stores/modelStore'
import {
  Settings2, Cpu, Brain, Database, Sliders,
  RotateCcw, Check, Server, RefreshCw, Zap, KeyRound, ShieldCheck, AlertTriangle
} from 'lucide-react'

// ─── Reusable slider row ────────────────────────────────────────────────────
function SliderRow({
  label, hint, value, min, max, step, onChange, displayFn
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  displayFn?: (v: number) => string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-primary font-medium">{label}</label>
        <span className="text-sm text-red-bright font-mono tabular-nums">
          {displayFn ? displayFn(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-red-600 cursor-pointer"
      />
      <p className="text-xs text-text-dim">{hint}</p>
    </div>
  )
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border-glass bg-abyss/60 p-5 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-2">
        <Icon size={13} className="text-red-core" />
        {title}
      </h2>
      {children}
    </div>
  )
}

// ─── Main Settings page ─────────────────────────────────────────────────────
export default function Settings() {
  const {
    defaultModel, modelParams, ragChunkSize, ragChunkOverlap,
    ragTopK, ragMinScore, ragEmbeddingModel, ollamaUrl,
    nvidiaApiKey, loadFromDB, setSetting,
  } = useSettingsStore()

  const { availableModels, setAvailableModels } = useModelStore()
  const [saved, setSaved] = useState(false)
  const [ollamaUrlInput, setOllamaUrlInput] = useState(ollamaUrl)
  const [nvKeyInput, setNvKeyInput] = useState(nvidiaApiKey)
  const [nvKeyStatus, setNvKeyStatus] = useState<'idle'|'checking'|'ok'|'error'>('idle')
  const [nvKeyError, setNvKeyError] = useState('')

  useEffect(() => {
    loadFromDB()
    fetchModels()
  }, [])

  useEffect(() => {
    setOllamaUrlInput(ollamaUrl)
  }, [ollamaUrl])

  const fetchModels = async () => {
    const models = await window.electron?.invoke('ollama:models')
    if (models) setAvailableModels(models)
  }

  const flash = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const updateParam = <K extends keyof typeof modelParams>(key: K, value: typeof modelParams[K]) => {
    const next = { ...modelParams, [key]: value }
    setSetting('modelParams', next)
    flash()
  }

  const verifyNvidiaKey = async () => {
    if (!nvKeyInput.trim()) return
    setNvKeyStatus('checking')
    setNvKeyError('')
    const result = await window.electron?.invoke('nvidia:check', nvKeyInput.trim())
    if (result?.ok) {
      setNvKeyStatus('ok')
      setSetting('nvidiaApiKey', nvKeyInput.trim())
      flash()
    } else {
      setNvKeyStatus('error')
      setNvKeyError(result?.error ?? 'Unknown error')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b border-border-glass glass-deep flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-lg text-text-primary tracking-wide flex items-center gap-2">
          <Settings2 size={18} className="text-red-core" />
          Settings
        </h1>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1">
            <Check size={11} />
            Saved
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* ── Default Model ─────────────────────────────────────────────── */}
          <Section title="Default Language Model" icon={Brain}>
            <p className="text-xs text-text-dim">
              This model will be automatically loaded and warmed up when Kurumi starts.
            </p>
            <div className="flex gap-3">
              <select
                value={defaultModel ?? ''}
                onChange={(e) => { setSetting('defaultModel', e.target.value); flash() }}
                className="flex-1 bg-black/30 border border-border-glass rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-red-core/60 transition-colors"
              >
                <option value="">— Select a model —</option>
                {availableModels.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
              <button
                onClick={fetchModels}
                className="p-2.5 rounded-lg border border-border-glass text-text-dim hover:text-red-bright hover:border-red-core/40 transition-all"
                title="Refresh model list"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </Section>

          {/* ── Model Parameters ──────────────────────────────────────────── */}
          <Section title="Model Parameters" icon={Sliders}>
            <p className="text-xs text-text-dim">
              These settings are applied to every chat message sent to the active model.
            </p>

            <SliderRow
              label="Temperature"
              hint="Controls randomness. Lower = more focused, higher = more creative."
              value={modelParams.temperature}
              min={0} max={2} step={0.05}
              onChange={(v) => updateParam('temperature', v)}
            />
            <SliderRow
              label="Top-P"
              hint="Nucleus sampling cutoff. 0.9 keeps the top 90% of probable tokens."
              value={modelParams.top_p}
              min={0} max={1} step={0.05}
              onChange={(v) => updateParam('top_p', v)}
            />
            <SliderRow
              label="Top-K"
              hint="Limit sampling to the K most probable next tokens."
              value={modelParams.top_k}
              min={1} max={100} step={1}
              onChange={(v) => updateParam('top_k', v)}
            />
            <SliderRow
              label="Repeat Penalty"
              hint="Penalises repeating the same words. 1.0 = no penalty."
              value={modelParams.repeat_penalty}
              min={1} max={2} step={0.05}
              onChange={(v) => updateParam('repeat_penalty', v)}
            />
            <SliderRow
              label="Context Window (tokens)"
              hint="How many tokens of conversation history the model can see."
              value={modelParams.num_ctx}
              min={512} max={131072} step={512}
              displayFn={(v) => v.toLocaleString()}
              onChange={(v) => updateParam('num_ctx', v)}
            />

            <button
              onClick={() => { setSetting('modelParams', { temperature: 0.7, top_p: 0.9, top_k: 40, repeat_penalty: 1.1, num_ctx: 4096 }); flash() }}
              className="flex items-center gap-1.5 text-xs text-text-dim hover:text-red-bright transition-colors"
            >
              <RotateCcw size={11} />
              Reset to defaults
            </button>
          </Section>

          {/* ── RAG Settings ──────────────────────────────────────────────── */}
          <Section title="Knowledge Base (RAG)" icon={Database}>
            <p className="text-xs text-text-dim">
              Controls how documents are chunked and retrieved during chat. Changes apply to new documents indexed after saving.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm text-text-primary font-medium">Embedding Model</label>
              <input
                type="text"
                value={ragEmbeddingModel}
                onChange={(e) => { setSetting('ragEmbeddingModel', e.target.value); flash() }}
                className="w-full bg-black/30 border border-border-glass rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-red-core/60 transition-colors"
                placeholder="nomic-embed-text"
              />
              <p className="text-xs text-text-dim">
                Ollama model used for document embeddings. nomic-embed-text is fast; qwen3-embedding is more accurate.
              </p>
            </div>

            <SliderRow
              label="Chunk Size (characters)"
              hint="Maximum characters per document chunk. Smaller = more precise retrieval, larger = more context."
              value={ragChunkSize}
              min={200} max={4000} step={100}
              displayFn={(v) => `${v} chars`}
              onChange={(v) => { setSetting('ragChunkSize', v); flash() }}
            />
            <SliderRow
              label="Chunk Overlap (characters)"
              hint="Characters shared between adjacent chunks to preserve boundary context."
              value={ragChunkOverlap}
              min={0} max={500} step={25}
              displayFn={(v) => `${v} chars`}
              onChange={(v) => { setSetting('ragChunkOverlap', v); flash() }}
            />
            <SliderRow
              label="Top-K Retrieval"
              hint="Number of document chunks to inject into context per query."
              value={ragTopK}
              min={1} max={10} step={1}
              onChange={(v) => { setSetting('ragTopK', v); flash() }}
            />
            <SliderRow
              label="Minimum Similarity Score"
              hint="Chunks with cosine similarity below this are ignored. 0 = always inject, 1 = perfect match only."
              value={ragMinScore}
              min={0} max={1} step={0.05}
              onChange={(v) => { setSetting('ragMinScore', v); flash() }}
            />
          </Section>

          {/* ── NVIDIA AI API ─────────────────────────────────────────────── */}
          <Section title="NVIDIA AI Cloud" icon={KeyRound}>
            <p className="text-xs text-text-dim">
              Add your NVIDIA NIM API key to access cloud-hosted LLMs like Llama 3.3 70B, Nemotron, DeepSeek and more.
              Get a free key at <span className="text-green-400">build.nvidia.com</span>.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                value={nvKeyInput}
                onChange={(e) => { setNvKeyInput(e.target.value); setNvKeyStatus('idle') }}
                onKeyDown={(e) => e.key === 'Enter' && verifyNvidiaKey()}
                placeholder="nvapi-..."
                className="flex-1 bg-black/30 border border-border-glass rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-green-400/60 transition-colors font-mono"
              />
              <button
                onClick={verifyNvidiaKey}
                disabled={nvKeyStatus === 'checking' || !nvKeyInput.trim()}
                className="px-4 py-2.5 text-sm rounded-lg border border-green-400/30 text-green-400 bg-green-400/10 hover:bg-green-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {nvKeyStatus === 'checking' ? 'Checking…' : 'Verify & Save'}
              </button>
            </div>

            {nvKeyStatus === 'ok' && (
              <p className="flex items-center gap-1.5 text-xs text-green-400">
                <ShieldCheck size={12} /> API key is valid and saved.
              </p>
            )}
            {nvKeyStatus === 'error' && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={12} /> {nvKeyError}
              </p>
            )}
            {nvidiaApiKey && nvKeyStatus === 'idle' && (
              <p className="text-xs text-text-dim">✓ A key is already saved. Enter a new one above to replace it.</p>
            )}
          </Section>

          {/* ── Ollama Connection ─────────────────────────────────────────── */}
          <Section title="Ollama Connection" icon={Server}>
            <div className="flex gap-3">
              <input
                type="text"
                value={ollamaUrlInput}
                onChange={(e) => setOllamaUrlInput(e.target.value)}
                onBlur={() => { setSetting('ollamaUrl', ollamaUrlInput); flash() }}
                className="flex-1 bg-black/30 border border-border-glass rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-red-core/60 transition-colors"
                placeholder="http://localhost:11434"
              />
            </div>
            <p className="text-xs text-text-dim">
              URL of the local Ollama API server. Restart the app after changing this.
            </p>
          </Section>

          {/* ── GPU Info ─────────────────────────────────────────────────── */}
          <Section title="GPU Status" icon={Zap}>
            <GpuStatus />
          </Section>

        </div>
      </div>
    </div>
  )
}

// ─── GPU live status widget ──────────────────────────────────────────────────
function GpuStatus() {
  const { systemStats, updateSystemStats } = useSettingsStore()

  useEffect(() => {
    const poll = async () => {
      const stats = await window.electron?.invoke('system:stats')
      if (stats) updateSystemStats(stats)
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [])

  const { gpuName, vramUsed, vramTotal, ramUsed, ramTotal, vramSource } = systemStats
  const vramPct = vramTotal > 0 ? Math.round((vramUsed / vramTotal) * 100) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary flex items-center gap-2">
          <Cpu size={14} className="text-red-core" />
          {gpuName}
        </span>
        {vramSource && (
          <span className="text-xs text-text-dim bg-white/5 rounded px-2 py-0.5">
            via {vramSource}
          </span>
        )}
      </div>

      {/* VRAM bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-text-dim">
          <span>VRAM</span>
          <span className="tabular-nums">
            {vramTotal > 0
              ? `${vramUsed} / ${vramTotal} GB`
              : vramUsed > 0
                ? `${vramUsed} GB used`
                : 'Not detected'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-core to-red-bright"
            style={{ width: vramPct !== null ? `${vramPct}%` : vramUsed > 0 ? '50%' : '0%' }}
          />
        </div>
      </div>

      {/* RAM bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-text-dim">
          <span>RAM</span>
          <span className="tabular-nums">{ramUsed} / {ramTotal} GB</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-600 to-blue-400"
            style={{ width: ramTotal > 0 ? `${Math.round((ramUsed / ramTotal) * 100)}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  )
}
