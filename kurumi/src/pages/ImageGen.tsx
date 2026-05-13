import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Link2, Sparkles, Wand2, Save } from 'lucide-react'
import GlassPanel from '../components/ui/GlassPanel'
import CursedButton from '../components/ui/CursedButton'
import CursedInput from '../components/ui/CursedInput'
import { useModelStore } from '../stores/modelStore'

type Backend = 'automatic1111' | 'comfyui'

const LS_BASE = 'kurumi.imageGen.baseUrl'
const LS_BACKEND = 'kurumi.imageGen.backend'

const SAMPLERS = [
  'Euler a',
  'Euler',
  'DPM++ 2M Karras',
  'DPM++ SDE Karras',
  'DDIM',
  'LMS Karras',
]

export default function ImageGen() {
  const { activeImageGenCheckpoint, setActiveImageGenCheckpoint } = useModelStore()
  const [backend, setBackend] = useState<Backend>('automatic1111')
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:7860')
  const [mode, setMode] = useState<'txt2img' | 'img2img'>('txt2img')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [steps, setSteps] = useState(28)
  const [cfgScale, setCfgScale] = useState(7)
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)
  const [sampler, setSampler] = useState('Euler a')
  const [seed, setSeed] = useState('')
  const [denoise, setDenoise] = useState(0.55)
  const [initFileName, setInitFileName] = useState<string | null>(null)
  const [initB64, setInitB64] = useState<string | null>(null)

  const [localCheckpoints, setLocalCheckpoints] = useState<string[]>([])

  const [probeStatus, setProbeStatus] = useState<string | null>(null)
  const [probeOk, setProbeOk] = useState<boolean | null>(null)
  const [probing, setProbing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)

  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const selectedCheckpoint = useMemo(() => activeImageGenCheckpoint, [activeImageGenCheckpoint])

  useEffect(() => {
    try {
      const b = localStorage.getItem(LS_BACKEND) as Backend | null
      const u = localStorage.getItem(LS_BASE)
      if (b === 'automatic1111' || b === 'comfyui') setBackend(b)
      if (u) setBaseUrl(u)
    } catch {
      /* ignore */
    }
  }, [])

  const persistConnection = useCallback(() => {
    try {
      localStorage.setItem(LS_BACKEND, backend)
      localStorage.setItem(LS_BASE, baseUrl.trim())
    } catch {
      /* ignore */
    }
  }, [backend, baseUrl])

  const loadCheckpoints = useCallback(async () => {
    try {
      const res = await window.electron?.invoke('imagegen:sd-models', { baseUrl: baseUrl.trim() })
      if (res?.ok && Array.isArray(res.titles)) setLocalCheckpoints(res.titles)
    } catch {
      /* ignore */
    }
  }, [baseUrl])

  useEffect(() => {
    if (probeOk && backend === 'automatic1111') void loadCheckpoints()
  }, [probeOk, backend, loadCheckpoints])

  const onInitFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setInitFileName(f.name)
    const r = new FileReader()
    r.onload = () => {
      const data = String(r.result || '')
      const raw = data.includes(',') ? data.split(',')[1] : data
      setInitB64(raw || null)
    }
    r.readAsDataURL(f)
  }

  const runProbe = async () => {
    setProbing(true)
    setProbeStatus(null)
    setProbeOk(null)
    setError(null)
    persistConnection()
    try {
      const res = await window.electron?.invoke('imagegen:probe', { backend, baseUrl: baseUrl.trim() })
      setProbeOk(!!res?.ok)
      setProbeStatus(res?.message || 'No response')
    } catch (e) {
      setProbeOk(false)
      setProbeStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setProbing(false)
    }
  }

  const runGenerate = async () => {
    if (!prompt.trim()) {
      setError('Enter a prompt first.')
      return
    }
    if (mode === 'img2img' && !initB64) {
      setError('Choose an input image for img2img.')
      return
    }
    setGenerating(true)
    setError(null)
    setImageDataUrl(null)
    setSaveMsg(null)
    persistConnection()
    try {
      const seedNum = seed.trim() === '' ? -1 : Number.parseInt(seed, 10)
      const commonParams = {
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim(),
        steps,
        cfg_scale: cfgScale,
        width,
        height,
        sampler_name: sampler,
        seed: Number.isFinite(seedNum) ? seedNum : -1,
        sd_model_checkpoint: selectedCheckpoint || undefined,
      }

      const res =
        mode === 'txt2img'
          ? await window.electron?.invoke('imagegen:txt2img', {
              backend,
              baseUrl: baseUrl.trim(),
              params: commonParams,
            })
          : await window.electron?.invoke('imagegen:img2img', {
              backend,
              baseUrl: baseUrl.trim(),
              params: {
                ...commonParams,
                init_image_base64: initB64!,
                denoising_strength: denoise,
              },
            })
      if (!res?.ok) {
        setError(res?.error || 'Generation failed')
        return
      }
      const b64 = res.images?.[0]
      if (!b64) {
        setError('Empty image response')
        return
      }
      setImageDataUrl(`data:image/png;base64,${b64}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  const saveToDisk = async () => {
    if (!imageDataUrl) return
    const raw = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl
    const name = `kurumi-${mode}-${Date.now()}`
    const res = await window.electron?.invoke('imagegen:save-image', {
      base64Png: raw,
      suggestedName: name,
    })
    if (res?.ok) {
      setSaveMsg(`Saved to ${res.path}`)
    } else {
      setSaveMsg(res?.error || 'Save failed')
    }
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display text-text-primary flex items-center gap-3">
              <span className="p-2 rounded-lg bg-red-core/20 border border-border-glass text-red-bright">
                <ImageIcon size={26} />
              </span>
              Image Generation Studio
            </h1>
            <p className="text-sm text-text-secondary mt-2 max-w-2xl leading-relaxed">
              <strong className="text-text-primary">AUTOMATIC1111</strong> WebUI: txt2img, img2img, checkpoint
              override, and saving PNGs under the app userData folder.{' '}
              <strong className="text-text-primary">ComfyUI</strong>: connection test only (no queue in this build).
              Launch WebUI with API enabled (default for A1111).
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassPanel className="p-5 space-y-5" variant="deep" glowing>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <Link2 size={14} className="text-red-core" />
              Connection
            </h2>

            <div className="flex flex-wrap gap-3">
              {(['automatic1111', 'comfyui'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBackend(b)
                    setProbeOk(null)
                    setProbeStatus(null)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
                    ${backend === b
                      ? 'border-red-bright bg-red-core/25 text-red-glow shadow-[0_0_12px_rgba(255,34,68,0.15)]'
                      : 'border-border-glass text-text-secondary hover:border-red-muted hover:text-text-primary'
                    }`}
                >
                  {b === 'automatic1111' ? 'Automatic1111' : 'ComfyUI'}
                </button>
              ))}
            </div>

            <CursedInput
              label="API base URL"
              placeholder="http://127.0.0.1:7860"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />

            <div className="flex flex-wrap gap-3">
              <CursedButton type="button" variant="secondary" onClick={runProbe} isLoading={probing}>
                Test connection
              </CursedButton>
            </div>

            {probeStatus && (
              <p
                className={`text-sm rounded-lg px-3 py-2 border ${
                  probeOk
                    ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200'
                    : 'border-red-core/40 bg-red-core/10 text-red-glow'
                }`}
              >
                {probeStatus}
              </p>
            )}

            <div className="border-t border-border-glass pt-5 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                <Sparkles size={14} className="text-red-core" />
                Generation mode
              </h2>
              <div className="flex flex-wrap gap-2">
                {(['txt2img', 'img2img'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    disabled={backend !== 'automatic1111'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${mode === m
                        ? 'border-red-bright bg-red-core/25 text-red-glow'
                        : 'border-border-glass text-text-secondary hover:border-red-muted'
                      } disabled:opacity-40`}
                  >
                    {m === 'txt2img' ? 'Txt2img' : 'Img2img'}
                  </button>
                ))}
              </div>

              {backend === 'automatic1111' && localCheckpoints.length > 0 && (
                <div>
                  <label className="text-xs text-text-dim uppercase tracking-wide block mb-1">
                    Checkpoint (optional)
                  </label>
                  <select
                    value={selectedCheckpoint || ''}
                    onChange={(e) =>
                      setActiveImageGenCheckpoint(e.target.value ? e.target.value : null)
                    }
                    className="w-full bg-abyss/80 border border-border-glass rounded-lg px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="">— WebUI default —</option>
                    {localCheckpoints.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-text-dim mt-1">
                    Matches the checkpoint list from the Models page. Reloads after a successful connection test.
                  </p>
                </div>
              )}

              {mode === 'img2img' && backend === 'automatic1111' && (
                <div className="space-y-2 rounded-lg border border-border-glass bg-black/20 p-3">
                  <label className="text-xs text-text-dim uppercase tracking-wide">Init image</label>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onInitFile} className="text-xs text-text-secondary w-full" />
                  {initFileName && (
                    <p className="text-xs text-text-secondary font-mono truncate">Loaded: {initFileName}</p>
                  )}
                  <div>
                    <label className="text-xs text-text-dim block mb-1">Denoising strength ({denoise})</label>
                    <input
                      type="range"
                      min={0.05}
                      max={0.95}
                      step={0.01}
                      value={denoise}
                      onChange={(e) => setDenoise(Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>
                </div>
              )}

              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-2 pt-2">
                <Wand2 size={14} className="text-red-core" />
                Prompt
              </h2>

              <label className="block text-xs text-text-dim uppercase tracking-wide">Positive</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Describe the image you want…"
                className="w-full bg-abyss/80 border border-border-glass rounded-lg px-4 py-3 text-text-primary text-sm
                  focus:outline-none focus:border-red-glow focus:shadow-[0_0_15px_rgba(255,34,68,0.25)] resize-y min-h-[100px]"
              />

              <label className="block text-xs text-text-dim uppercase tracking-wide">Negative</label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={2}
                placeholder="Things to avoid…"
                className="w-full bg-abyss/80 border border-border-glass rounded-lg px-4 py-3 text-text-primary text-sm
                  focus:outline-none focus:border-red-glow focus:shadow-[0_0_15px_rgba(255,34,68,0.25)] resize-y"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-dim uppercase tracking-wide block mb-1">Steps</label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-full bg-abyss/80 border border-border-glass rounded-lg px-3 py-2 text-sm text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-dim uppercase tracking-wide block mb-1">CFG scale</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    step={0.5}
                    value={cfgScale}
                    onChange={(e) => setCfgScale(Number(e.target.value))}
                    className="w-full bg-abyss/80 border border-border-glass rounded-lg px-3 py-2 text-sm text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-dim uppercase tracking-wide block mb-1">Width</label>
                  <input
                    type="number"
                    step={64}
                    min={64}
                    max={2048}
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-abyss/80 border border-border-glass rounded-lg px-3 py-2 text-sm text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-dim uppercase tracking-wide block mb-1">Height</label>
                  <input
                    type="number"
                    step={64}
                    min={64}
                    max={2048}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-abyss/80 border border-border-glass rounded-lg px-3 py-2 text-sm text-text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-dim uppercase tracking-wide block mb-1">Sampler</label>
                <select
                  value={sampler}
                  onChange={(e) => setSampler(e.target.value)}
                  className="w-full bg-abyss/80 border border-border-glass rounded-lg px-3 py-2 text-sm text-text-primary"
                >
                  {SAMPLERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <CursedInput
                label="Seed (optional, blank = random)"
                placeholder="-1"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />

              {error && (
                <p className="text-sm text-red-glow border border-red-core/30 rounded-lg px-3 py-2 bg-red-core/10">
                  {error}
                </p>
              )}

              <CursedButton
                type="button"
                variant="primary"
                onClick={runGenerate}
                disabled={backend !== 'automatic1111'}
                isLoading={generating}
                className="w-full sm:w-auto inline-flex gap-2"
              >
                <Sparkles size={18} />
                {generating ? 'Summoning pixels…' : mode === 'txt2img' ? 'Generate (txt2img)' : 'Generate (img2img)'}
              </CursedButton>

              {saveMsg && (
                <p className="text-xs text-emerald-400/90 border border-emerald-800/40 rounded-lg px-3 py-2 bg-emerald-950/20">
                  {saveMsg}
                </p>
              )}

              {backend !== 'automatic1111' && (
                <p className="text-xs text-text-dim">
                  Switch to Automatic1111 for txt2img / img2img. ComfyUI only supports the connection test here.
                </p>
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 min-h-[320px] flex flex-col" variant="surface">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                Preview
              </h2>
              {imageDataUrl && (
                <CursedButton type="button" variant="secondary" onClick={() => void saveToDisk()} className="!px-3 !py-1.5 text-xs">
                  <Save size={14} className="mr-1.5" />
                  Save PNG
                </CursedButton>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center rounded-xl border border-border-glass bg-black/30 min-h-[280px]">
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt="Generated"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg border border-border-glass"
                />
              ) : (
                <div className="text-center px-6 py-12 text-text-dim text-sm">
                  <ImageIcon className="mx-auto mb-3 opacity-40" size={48} />
                  Generated images appear here as PNG.
                </div>
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
