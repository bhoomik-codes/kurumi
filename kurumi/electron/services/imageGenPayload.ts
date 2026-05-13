/**
 * Pure helpers for Automatic1111 payloads — safe for unit tests without Electron.
 */

export type ImageGenBackend = 'automatic1111' | 'comfyui'

export interface Txt2ImgParams {
  prompt: string
  negative_prompt?: string
  steps?: number
  cfg_scale?: number
  width?: number
  height?: number
  sampler_name?: string
  seed?: number
  sd_model_checkpoint?: string
}

export interface Img2ImgParams extends Txt2ImgParams {
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

export function normalizeBaseUrl(raw: string): string {
  const t = raw.trim().replace(/\/+$/, '')
  if (!t) return 'http://127.0.0.1:7860'
  return t
}

export function buildTxt2ImgBody(params: Txt2ImgParams): Record<string, unknown> {
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
}

export function generationTimeoutMs(): number {
  const raw = process.env.KURUMI_A1111_TIMEOUT_MS
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 60_000 && n <= 3_600_000) return n
  return 600_000
}
