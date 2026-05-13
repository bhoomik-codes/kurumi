/**
 * Local image generation (main process — no CORS).
 * Automatic1111: txt2img / img2img via REST API
 * ComfyUI: connectivity probe + optional queue (minimal workflow)
 */

import { app } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export type ImageGenBackend = 'automatic1111' | 'comfyui'

function normalizeBaseUrl(raw: string): string {
  const t = raw.trim().replace(/\/+$/, '')
  if (!t) return 'http://127.0.0.1:7860'
  return t
}

export interface Txt2ImgParams {
  prompt: string
  negative_prompt?: string
  steps?: number
  cfg_scale?: number
  width?: number
  height?: number
  sampler_name?: string
  seed?: number
  /** A1111 checkpoint title as returned by /sdapi/v1/sd-models */
  sd_model_checkpoint?: string
}

export interface Img2ImgParams extends Txt2ImgParams {
  /** PNG base64 without data URL prefix */
  init_image_base64: string
  denoising_strength?: number
}

const DEFAULT_TXT2IMG: Partial<Txt2ImgParams> = {
  steps: 28,
  cfg_scale: 7,
  width: 512,
  height: 512,
  sampler_name: 'Euler a',
  seed: -1,
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ ok: boolean; status: number; data?: T; text?: string }> {
  const timeoutMs = init?.timeoutMs ?? 12_000
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
    })
    const text = await res.text()
    let data: T | undefined
    try {
      data = text ? (JSON.parse(text) as T) : undefined
    } catch {
      data = undefined
    }
    return { ok: res.ok, status: res.status, data, text }
  } finally {
    clearTimeout(t)
  }
}

export const ImageGenService = {
  normalizeBaseUrl,

  async listSdModels(baseUrl: string): Promise<{ titles: string[] }> {
    const base = normalizeBaseUrl(baseUrl)
    const r = await fetchJson<Array<{ title?: string; model_name?: string }>>(
      `${base}/sdapi/v1/sd-models`,
      { timeoutMs: 15_000 }
    )
    if (!r.ok || !Array.isArray(r.data)) {
      throw new Error(r.text?.slice(0, 200) || `HTTP ${r.status}`)
    }
    const titles = r.data
      .map((m) => m.title || m.model_name || '')
      .filter(Boolean)
    return { titles }
  },

  async probe(backend: ImageGenBackend, baseUrl: string): Promise<{ ok: boolean; message: string }> {
    const base = normalizeBaseUrl(baseUrl)

    try {
      if (backend === 'automatic1111') {
        const r = await fetchJson<unknown[]>(`${base}/sdapi/v1/sd-models`, { timeoutMs: 10_000 })
        if (r.ok && Array.isArray(r.data)) {
          return { ok: true, message: `Connected — ${r.data.length} checkpoint(s) visible` }
        }
        return {
          ok: false,
          message: r.text?.slice(0, 200) || `HTTP ${r.status}`,
        }
      }

      const candidates = [`${base}/system_stats`, `${base}/queue`]
      for (const url of candidates) {
        const r = await fetchJson<unknown>(url, { method: 'GET', timeoutMs: 8_000 })
        if (r.ok) {
          return { ok: true, message: 'ComfyUI server responded' }
        }
      }
      return { ok: false, message: 'Could not reach ComfyUI (default port 8188)' }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('aborted')) {
        return { ok: false, message: 'Connection timed out' }
      }
      return { ok: false, message: msg }
    }
  },

  buildTxt2ImgBody(params: Txt2ImgParams): Record<string, unknown> {
    const body: Record<string, unknown> = {
      ...DEFAULT_TXT2IMG,
      prompt: params.prompt,
      negative_prompt: params.negative_prompt ?? '',
      steps: params.steps ?? DEFAULT_TXT2IMG.steps,
      cfg_scale: params.cfg_scale ?? DEFAULT_TXT2IMG.cfg_scale,
      width: params.width ?? DEFAULT_TXT2IMG.width,
      height: params.height ?? DEFAULT_TXT2IMG.height,
      sampler_name: params.sampler_name ?? DEFAULT_TXT2IMG.sampler_name,
      seed: params.seed ?? -1,
    }
    if (params.sd_model_checkpoint?.trim()) {
      body.override_settings = { sd_model_checkpoint: params.sd_model_checkpoint.trim() }
    }
    return body
  },

  async txt2imgAutomatic1111(
    baseUrl: string,
    params: Txt2ImgParams
  ): Promise<{ images: string[] }> {
    const base = normalizeBaseUrl(baseUrl)
    const body = ImageGenService.buildTxt2ImgBody(params)

    const r = await fetch(`${base}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(600_000),
    })

    const text = await r.text()
    if (!r.ok) {
      throw new Error(text.slice(0, 500) || `HTTP ${r.status}`)
    }

    let parsed: { images?: string[] }
    try {
      parsed = JSON.parse(text) as { images?: string[] }
    } catch {
      throw new Error('Invalid JSON from txt2img endpoint')
    }

    if (!parsed.images?.length) {
      throw new Error('No images in API response')
    }

    return { images: parsed.images }
  },

  async img2imgAutomatic1111(
    baseUrl: string,
    params: Img2ImgParams
  ): Promise<{ images: string[] }> {
    const base = normalizeBaseUrl(baseUrl)
    const body: Record<string, unknown> = {
      ...ImageGenService.buildTxt2ImgBody(params),
      init_images: [params.init_image_base64],
      denoising_strength: params.denoising_strength ?? 0.55,
    }

    const r = await fetch(`${base}/sdapi/v1/img2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(600_000),
    })

    const text = await r.text()
    if (!r.ok) {
      throw new Error(text.slice(0, 500) || `HTTP ${r.status}`)
    }

    let parsed: { images?: string[] }
    try {
      parsed = JSON.parse(text) as { images?: string[] }
    } catch {
      throw new Error('Invalid JSON from img2img endpoint')
    }

    if (!parsed.images?.length) {
      throw new Error('No images in API response')
    }

    return { images: parsed.images }
  },

  async savePngBase64(base64Png: string, suggestedName?: string): Promise<{ path: string }> {
    const dir = join(app.getPath('userData'), 'generated-images')
    await mkdir(dir, { recursive: true })
    const safe =
      (suggestedName || `kurumi-${Date.now()}`)
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .slice(0, 120) || `kurumi-${Date.now()}`
    const name = safe.endsWith('.png') ? safe : `${safe}.png`
    const full = join(dir, name)
    const buf = Buffer.from(base64Png, 'base64')
    await writeFile(full, buf)
    return { path: full }
  },
}
