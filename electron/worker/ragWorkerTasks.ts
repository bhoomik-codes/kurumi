import { v4 as uuidv4 } from 'uuid'
import { parseService } from '../services/ParseService'
import { chunkText } from '../services/ragChunking'
import type { EmbeddingRuntime } from '../services/embeddingRuntime'
import { VectorStoreCore } from '../services/vectorStoreCore'

export interface WorkerRuntime {
  embed: EmbeddingRuntime
  store: VectorStoreCore
}

export async function runIndexDocument(
  rt: WorkerRuntime,
  params: {
    docId: string
    filePath: string
    filename: string
  },
  onProgress: (done: number, total: number) => void
): Promise<{ chunks: number; warning?: string }> {
  const { text, warning } = await parseService.parseFile(params.filePath)

  if (!text || text.trim().length === 0) {
    return { chunks: 0, warning: warning ?? 'No text could be extracted.' }
  }

  const chunks = chunkText(text)
  if (chunks.length === 0) {
    return { chunks: 0, warning: 'Text was extracted but produced no usable chunks.' }
  }

  let i = 0
  for (const chunk of chunks) {
    const embedding = await rt.embed.embedText(chunk)
    await rt.store.insertChunk({
      id: uuidv4(),
      documentId: params.docId,
      filename: params.filename,
      content: chunk,
      embedding,
      chunkIndex: i,
    })
    i++
    onProgress(i, chunks.length)
    if (i % 2 === 0) {
      await new Promise<void>((resolve) => setImmediate(resolve))
    }
  }

  return { chunks: chunks.length }
}

export async function runSearch(
  rt: WorkerRuntime,
  params: {
    query: string
    topK: number
    minScore: number
    indexedDocumentIds: string[]
  }
) {
  const queryEmbedding = await rt.embed.embedText(params.query)
  if (!queryEmbedding.length) return []
  return rt.store.search(queryEmbedding, params.topK, params.minScore, params.indexedDocumentIds)
}

export async function runDelete(rt: WorkerRuntime, docId: string): Promise<void> {
  await rt.store.deleteByDocumentId(docId)
}
