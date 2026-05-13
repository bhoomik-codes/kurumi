import { v4 as uuidv4 } from 'uuid'
import { dbService } from './DatabaseService'
import { parseService } from './ParseService'
import { embeddingService } from './EmbeddingService'
import { vectorStore } from './VectorStore'

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────
// Approximate 512-token chunks with overlap for context continuity.
const CHARS_PER_TOKEN = 4
const CHUNK_TOKENS = 512
const CHUNK_OVERLAP_TOKENS = 128
const CHUNK_CHARS = CHUNK_TOKENS * CHARS_PER_TOKEN
const CHUNK_OVERLAP = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN

// ────────────────────────────────────────────────────────────────────────────
// Text chunker — sliding window with overlap
// Splits on double-newlines first, then hard-splits long paragraphs
// ────────────────────────────────────────────────────────────────────────────
function chunkText(text: string): string[] {
  // Normalise whitespace to avoid huge runs of blank lines inflating paragraph count
  const normalised = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  if (!normalised) return []

  // Hard-split any single paragraph that's too long into sub-sentences / slices
  const splitLong = (block: string): string[] => {
    if (block.length <= CHUNK_CHARS) return [block]
    const slices: string[] = []
    let pos = 0
    while (pos < block.length) {
      slices.push(block.slice(pos, pos + CHUNK_CHARS))
      pos += CHUNK_CHARS - CHUNK_OVERLAP
    }
    return slices
  }

  const paragraphs: string[] = normalised
    .split(/\n\n+/)
    .flatMap(p => splitLong(p.trim()))
    .filter(p => p.length > 30) // skip tiny fragments

  const chunks: string[] = []
  let current = ''

  for (const p of paragraphs) {
    // If adding this paragraph would overflow, flush current chunk
    if (current.length > 0 && current.length + p.length + 2 > CHUNK_CHARS) {
      chunks.push(current.trim())
      // Carry over the tail for overlap (last CHUNK_OVERLAP chars)
      const tail = current.slice(Math.max(0, current.length - CHUNK_OVERLAP))
      current = tail + '\n\n' + p
    } else {
      current = current ? current + '\n\n' + p : p
    }
  }
  if (current.trim()) chunks.push(current.trim())

  return chunks
}

// ────────────────────────────────────────────────────────────────────────────
// DocumentService
// ────────────────────────────────────────────────────────────────────────────
class DocumentService {

  public async processDocument(
    docId: string,
    filePath: string,
    filename: string,
    mimetype: string,
    sizeBytes: number
  ): Promise<{ success: boolean; chunks: number; warning?: string }> {
    console.log(`[RAG] Processing document: ${filename}`)

    // 1 — Insert row as 'processing'
    dbService.run(
      `INSERT INTO documents (id, filename, filepath, mimetype, size_bytes, status) VALUES (?, ?, ?, ?, ?, 'processing')`,
      [docId, filename, filePath, mimetype, sizeBytes]
    )

    try {
      // 2 — Parse
      const { text, warning } = await parseService.parseFile(filePath)

      if (!text || text.trim().length === 0) {
        // Mark as indexed with 0 chunks + warning in metadata
        dbService.run(
          `UPDATE documents SET chunk_count = 0, status = 'indexed', indexed_at = ?, metadata = ? WHERE id = ?`,
          [Date.now(), JSON.stringify({ warning: warning ?? 'No text could be extracted.' }), docId]
        )
        console.warn(`[RAG] No text extracted from ${filename}: ${warning}`)
        return { success: true, chunks: 0, warning }
      }

      // 3 — Chunk
      const chunks = chunkText(text)
      console.log(`[RAG] ${filename}: ${chunks.length} chunks from ${text.length} chars`)

      if (chunks.length === 0) {
        dbService.run(
          `UPDATE documents SET chunk_count = 0, status = 'indexed', indexed_at = ?, metadata = ? WHERE id = ?`,
          [Date.now(), JSON.stringify({ warning: 'Text was extracted but produced no usable chunks.' }), docId]
        )
        return { success: true, chunks: 0, warning: 'Text extracted but no usable chunks.' }
      }

      // 4 — Embed and store each chunk (yielding frequently for responsiveness)
      let i = 0
      for (const chunk of chunks) {
        const embedding = await embeddingService.embedText(chunk)
        await vectorStore.insertChunk({
          id: uuidv4(),
          documentId: docId,
          filename,
          content: chunk,
          embedding,
          chunkIndex: i,
        })
        i++
        if (i % 2 === 0) {
          await new Promise<void>((resolve) => setImmediate(resolve))
        }
      }

      // 5 — Update status
      dbService.run(
        `UPDATE documents SET chunk_count = ?, status = 'indexed', indexed_at = ? WHERE id = ?`,
        [chunks.length, Date.now(), docId]
      )

      console.log(`[RAG] ${filename} indexed successfully — ${chunks.length} chunks`)
      return { success: true, chunks: chunks.length }

    } catch (error: any) {
      console.error(`[RAG] Failed to process ${filename}:`, error)
      dbService.run(
        `UPDATE documents SET status = 'error', metadata = ? WHERE id = ?`,
        [JSON.stringify({ error: error.message }), docId]
      )
      throw error
    } finally {
      // Release embedding model from RAM after indexing to keep memory for chat LLMs.
      embeddingService.unload()
    }
  }

  public async searchSimilar(
    query: string,
    limit = 3,
    minScore = 0.25
  ): Promise<Array<{ id: string; document_id: string; filename: string; content: string; chunk_index: number; score: number }>> {
    console.log(`[RAG] Searching: "${query}"`)

    const queryEmbedding = await embeddingService.embedText(query)
    if (!queryEmbedding.length) {
      return []
    }
    return await vectorStore.search(queryEmbedding, limit, minScore)
  }

  public getDocuments() {
    return dbService.all(
      `SELECT id, filename, filepath, mimetype, size_bytes, chunk_count, indexed_at, status, metadata FROM documents ORDER BY indexed_at DESC`
    )
  }

  public async deleteDocument(docId: string) {
    await vectorStore.deleteByDocumentId(docId)
    dbService.run(`DELETE FROM documents WHERE id = ?`, [docId])
    return { success: true }
  }
}

export const documentService = new DocumentService()
