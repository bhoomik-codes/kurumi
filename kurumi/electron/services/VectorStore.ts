import { app } from 'electron'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { dbService } from './DatabaseService'

export interface VectorSearchResult {
  id: string
  document_id: string
  filename: string
  content: string
  chunk_index: number
  score: number
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

class VectorStore {
  private storageDir: string

  constructor() {
    this.storageDir = join(app.getPath('userData'), 'vectorstore')
    mkdirSync(this.storageDir, { recursive: true })
  }

  public getStorageDir() {
    return this.storageDir
  }

  public insertChunk(params: {
    id: string
    documentId: string
    content: string
    embedding: number[]
    chunkIndex: number
  }): void {
    dbService.run(
      `INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index) VALUES (?, ?, ?, ?, ?)`,
      [
        params.id,
        params.documentId,
        params.content,
        JSON.stringify(params.embedding),
        params.chunkIndex,
      ]
    )
  }

  public search(queryEmbedding: number[], topK = 4, minScore = 0.3): VectorSearchResult[] {
    const rows = dbService.all(
      `SELECT c.id, c.document_id, c.content, c.embedding, c.chunk_index, d.filename
       FROM document_chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE d.status = 'indexed'`
    ) as Array<{
      id: string
      document_id: string
      content: string
      embedding: string
      chunk_index: number
      filename: string
    }>

    const scored = rows
      .map((r) => {
        const emb = JSON.parse(r.embedding) as number[]
        return {
          id: r.id,
          document_id: r.document_id,
          filename: r.filename,
          content: r.content,
          chunk_index: r.chunk_index,
          score: cosineSimilarity(queryEmbedding, emb),
        }
      })
      .filter((r) => Number.isFinite(r.score))
      .sort((a, b) => b.score - a.score)
      .filter((r) => r.score >= minScore)

    if (scored.length <= topK) return scored

    // Keep diverse sources first to reduce redundant nearby chunks.
    const picked: VectorSearchResult[] = []
    const seenDoc = new Set<string>()
    for (const item of scored) {
      if (!seenDoc.has(item.document_id)) {
        picked.push(item)
        seenDoc.add(item.document_id)
      }
      if (picked.length >= topK) break
    }
    if (picked.length >= topK) return picked
    for (const item of scored) {
      if (!picked.find((p) => p.id === item.id)) picked.push(item)
      if (picked.length >= topK) break
    }
    return picked
  }
}

export const vectorStore = new VectorStore()
