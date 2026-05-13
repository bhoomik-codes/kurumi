import { ipcMain } from 'electron'
import {
  ImageGenService,
  type ImageGenBackend,
  type Img2ImgParams,
  type Txt2ImgParams,
} from '../services/ImageGenService'

export function registerImageGenIpc() {
  ipcMain.handle(
    'imagegen:probe',
    async (_e, payload: { backend: ImageGenBackend; baseUrl: string }) => {
      return ImageGenService.probe(payload.backend, payload.baseUrl)
    }
  )

  ipcMain.handle('imagegen:sd-models', async (_e, payload: { baseUrl: string }) => {
    try {
      const { titles } = await ImageGenService.listSdModels(payload.baseUrl)
      return { ok: true as const, titles }
    } catch (e: unknown) {
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
        const message = e instanceof Error ? e.message : String(e)
        return { ok: false as const, error: message }
      }
    }
  )
}
