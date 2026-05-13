import { describe, it, expect } from 'vitest'
import { normalizeBaseUrl, buildTxt2ImgBody } from './imageGenPayload'

describe('imageGenPayload', () => {
  it('normalizeBaseUrl trims slashes and defaults host', () => {
    expect(normalizeBaseUrl('')).toBe('http://127.0.0.1:7860')
    expect(normalizeBaseUrl('http://localhost:7860/')).toBe('http://localhost:7860')
  })

  it('buildTxt2ImgBody merges defaults and optional checkpoint override', () => {
    const b = buildTxt2ImgBody({
      prompt: 'a cat',
      negative_prompt: 'blur',
      steps: 10,
      sd_model_checkpoint: 'realisticVision.safetensors',
    })
    expect(b.prompt).toBe('a cat')
    expect(b.negative_prompt).toBe('blur')
    expect(b.steps).toBe(10)
    expect(b.override_settings).toEqual({
      sd_model_checkpoint: 'realisticVision.safetensors',
    })
  })

  it('buildTxt2ImgBody omits override_settings without checkpoint', () => {
    const b = buildTxt2ImgBody({ prompt: 'x' })
    expect(b.override_settings).toBeUndefined()
  })
})
