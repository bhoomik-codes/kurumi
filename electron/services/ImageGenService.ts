/**
 * Local image generation (main process — no CORS).
 * Automatic1111: txt2img / img2img via REST API
 * ComfyUI: connectivity probe
 */

import { app } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  type Img2ImgParams,
  type Txt2ImgParams,
  type ImageGenBackend,
  buildTxt2ImgBody,
  normalizeBaseUrl,
  generationTimeoutMs,
} from './imageGenPayload'

export type { ImageGenBackend, Txt2ImgParams, Img2ImgParams } from './imageGenPayload'

function probeTimeoutMs(): number {
  const raw = process.env.KURUMI_A1111_PROBE_MS
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 3_000 && n <= 120_000) return n
  return 15_000
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ ok: boolean; status: number; data?: T; text?: string }> {
  const timeoutMs = init?.timeoutMs ?? probeTimeoutMs()
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
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms (${url})`)
    }
    throw e
  } finally {
    clearTimeout(t)
  }
}

async function fetchAutomatic1111Generation(
  baseUrl: string,
  path: '/sdapi/v1/txt2img' | '/sdapi/v1/img2img',
  body: Record<string, unknown>
): Promise<{ images: string[] }> {
  const base = normalizeBaseUrl(baseUrl)
  const timeout = generationTimeoutMs()
  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    })
  } catch (e: unknown) {
    const nm = e instanceof Error ? e.name : ''
    const msg = e instanceof Error ? e.message : ''
    if (
      nm === 'TimeoutError' ||
      nm === 'AbortError' ||
      /timed?\s*out|aborted/i.test(msg)
    ) {
      throw new Error(
        `AUTOMATIC1111 request exceeded ${timeout}ms — set env KURUMI_A1111_TIMEOUT_MS or reduce steps/resolution`
      )
    }
    throw e
  }

  const text = await res.text()
  if (!res.ok) {
    throw new Error(text.slice(0, 500) || `HTTP ${res.status}`)
  }

  let parsed: { images?: string[] }
  try {
    parsed = JSON.parse(text) as { images?: string[] }
  } catch {
    throw new Error(`Invalid JSON from ${path} (API shape may have changed)`)
  }

  if (!parsed.images?.length) {
    throw new Error('No images in API response')
  }

  return { images: parsed.images }
}

export const ImageGenService = {
  normalizeBaseUrl,

  async listSdModels(baseUrl: string): Promise<{ titles: string[] }> {
    const base = normalizeBaseUrl(baseUrl)
    const r = await fetchJson<Array<{ title?: string; model_name?: string }>>(
      `${base}/sdapi/v1/sd-models`,
      { timeoutMs: probeTimeoutMs() }
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
    const tmo = probeTimeoutMs()

    try {
      if (backend === 'automatic1111') {
        const r = await fetchJson<unknown[]>(`${base}/sdapi/v1/sd-models`, { timeoutMs: tmo })
        if (r.ok && Array.isArray(r.data)) {
          return { ok: true, message: `Connected — ${r.data.length} checkpoint(s) visible` }
        }
        return {
          ok: false,
          message: r.text?.slice(0, 280) || `HTTP ${r.status} — verify WebUI version exposes /sdapi/v1/sd-models`,
        }
      }

      const candidates = [`${base}/system_stats`, `${base}/queue`]
      for (const url of candidates) {
        const r = await fetchJson<unknown>(url, { method: 'GET', timeoutMs: Math.min(tmo, 12_000) })
        if (r.ok) {
          return { ok: true, message: 'ComfyUI server responded' }
        }
      }
      return { ok: false, message: 'Could not reach ComfyUI (default port 8188)' }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('timed out') || msg.includes('AbortError')) {
        return {
          ok: false,
          message: `Connection timed out (${tmo}ms) — server busy or wrong URL/port`,
        }
      }
      return { ok: false, message: msg }
    }
  },

  buildTxt2ImgBody,

  async txt2imgAutomatic1111(
    baseUrl: string,
    params: Txt2ImgParams
  ): Promise<{ images: string[] }> {
    const body = buildTxt2ImgBody(params)
    return fetchAutomatic1111Generation(baseUrl, '/sdapi/v1/txt2img', body)
  },

  async img2imgAutomatic1111(
    baseUrl: string,
    params: Img2ImgParams
  ): Promise<{ images: string[] }> {
    const body: Record<string, unknown> = {
      ...buildTxt2ImgBody(params),
      init_images: [params.init_image_base64],
      denoising_strength: params.denoising_strength ?? 0.55,
    }
    return fetchAutomatic1111Generation(baseUrl, '/sdapi/v1/img2img', body)
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
