import { ipcMain } from 'electron'
import {
  ImageGenService,
  type ImageGenBackend,
  type Img2ImgParams,
  type Txt2ImgParams,
} from '../services/ImageGenService'
import { logIpcError } from '../utils/ipcLogger'

export function registerImageGenIpc() {
  ipcMain.handle(
    'imagegen:probe',
    async (_e, payload: { backend: ImageGenBackend; baseUrl: string }) => {
      try {
        return await ImageGenService.probe(payload.backend, payload.baseUrl)
      } catch (e: unknown) {
        logIpcError('imagegen:probe', e, { backend: payload.backend })
        return {
          ok: false as const,
          message: e instanceof Error ? e.message : String(e),
        }
      }
    }
  )

  ipcMain.handle('imagegen:sd-models', async (_e, payload: { baseUrl: string }) => {
    try {
      const { titles } = await ImageGenService.listSdModels(payload.baseUrl)
      return { ok: true as const, titles }
    } catch (e: unknown) {
      logIpcError('imagegen:sd-models', e, { baseUrl: payload.baseUrl?.slice(0, 80) })
      const message = e instanceof Error ? e.message : String(e)
      return { ok: false as const, error: message, titles: [] as string[] }
    }
  })

  ipcMain.handle(
    'imagegen:txt2img',
    async (
      _e,
      payload: { backend: ImageGenBackend; baseUrl: string; params: Txt2ImgParams }
    ) => {
      if (payload.backend !== 'automatic1111') {
        return {
          ok: false as const,
          error: 'Txt2img is implemented for Automatic1111 only. ComfyUI uses per-workflow graphs.',
        }
      }
      try {
        const { images } = await ImageGenService.txt2imgAutomatic1111(
          payload.baseUrl,
          payload.params
        )
        return { ok: true as const, images }
      } catch (e: unknown) {
        logIpcError('imagegen:txt2img', e, {
          baseUrl: payload.baseUrl?.slice(0, 80),
          mode: 'txt2img',
          w: payload.params.width,
          h: payload.params.height,
          steps: payload.params.steps,
        })
        const message = e instanceof Error ? e.message : String(e)
        return { ok: false as const, error: message }
      }
    }
  )

  ipcMain.handle(
    'imagegen:img2img',
    async (
      _e,
      payload: { backend: ImageGenBackend; baseUrl: string; params: Img2ImgParams }
    ) => {
      if (payload.backend !== 'automatic1111') {
        return {
          ok: false as const,
          error: 'Img2img is implemented for Automatic1111 only.',
        }
      }
      try {
        const { images } = await ImageGenService.img2imgAutomatic1111(
          payload.baseUrl,
          payload.params
        )
        return { ok: true as const, images }
      } catch (e: unknown) {
        logIpcError('imagegen:img2img', e, {
          baseUrl: payload.baseUrl?.slice(0, 80),
          mode: 'img2img',
        })
        const message = e instanceof Error ? e.message : String(e)
        return { ok: false as const, error: message }
      }
    }
  )

  ipcMain.handle(
    'imagegen:save-image',
    async (_e, payload: { base64Png: string; suggestedName?: string }) => {
      try {
        const { path } = await ImageGenService.savePngBase64(
          payload.base64Png,
          payload.suggestedName
        )
        return { ok: true as const, path }
      } catch (e: unknown) {
        logIpcError('imagegen:save-image', e)
        const message = e instanceof Error ? e.message : String(e)
        return { ok: false as const, error: message }
      }
    }
  )
}
