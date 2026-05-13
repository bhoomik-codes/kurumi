import { ipcMain } from 'electron'
import { documentService } from '../services/DocumentService'
import { dbService } from '../services/DatabaseService'

export function registerRagIpc() {
  // Fast COUNT check — avoids embedding the query when no documents are indexed
  ipcMain.handle('docs:hasChunks', () => {
    try {
      const row = dbService.get(
        `SELECT COUNT(*) as count FROM documents WHERE status = 'indexed' AND COALESCE(chunk_count, 0) > 0`
      ) as { count: number }
      return row.count > 0
    } catch {
      return false
    }
  })

  ipcMain.handle('docs:process', async (_, { docId, filePath, filename, mimetype, sizeBytes }) => {
    try {
      return await documentService.processDocument(docId, filePath, filename, mimetype, sizeBytes)
    } catch (error: any) {
      console.error('IPC docs:process error:', error)
      throw new Error(error.message)
    }
  })
  // Phase 6 canonical aliases (kept alongside docs:* for backward compatibility)
  ipcMain.handle('rag:index', async (_, payload) => {
    try {
      return await documentService.processDocument(
        payload.docId,
        payload.filePath,
        payload.filename,
        payload.mimetype,
        payload.sizeBytes
      )
    } catch (error: any) {
      console.error('IPC rag:index error:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('docs:search', async (_, query: string, limit: number = 3) => {
    try {
      return await documentService.searchSimilar(query, limit)
    } catch (error: any) {
      console.error('IPC docs:search error:', error)
      throw new Error(error.message)
    }
  })
  ipcMain.handle('rag:search', async (_, query: string, opts?: { topK?: number; minScore?: number }) => {
    try {
      const topK = Math.max(1, Math.min(12, opts?.topK ?? 4))
      const minScore = Math.max(0, Math.min(1, opts?.minScore ?? 0.3))
      return await documentService.searchSimilar(query, topK, minScore)
    } catch (error: any) {
      console.error('IPC rag:search error:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('docs:list', async () => {
    try {
      return documentService.getDocuments()
    } catch (error: any) {
      console.error('IPC docs:list error:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('docs:delete', async (_, docId: string) => {
    try {
      return documentService.deleteDocument(docId)
    } catch (error: any) {
      console.error('IPC docs:delete error:', error)
      throw new Error(error.message)
    }
  })
}
