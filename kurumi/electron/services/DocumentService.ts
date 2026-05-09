import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'
import { dbService } from './DatabaseService'

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────
const EMBEDDING_MODEL = 'qwen3-embedding:latest'
const OLLAMA_BASE_URL = 'http://localhost:11434'
const CHUNK_CHARS = 1800     // ≈ 450 tokens at ~4 chars/token
const CHUNK_OVERLAP = 200    // Overlap between consecutive chunks for context continuity

// ────────────────────────────────────────────────────────────────────────────
// Embedding helper — uses direct HTTP to avoid Ollama SDK version conflicts
// ────────────────────────────────────────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
    // qwen3-embedding:latest is a 7.6B model — on CPU each chunk can take 30-120s.
    // Node's default undici headers timeout is 30s which is far too short.
    // We set 10 minutes to safely cover even the slowest hardware.
    signal: AbortSignal.timeout(600_000)
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Embedding request failed (${response.status}): ${body}`)
  }

  const data = await response.json()

  if (!data.embedding || !Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error(`Ollama returned an empty embedding for model "${EMBEDDING_MODEL}". Is the model loaded?`)
  }

  return data.embedding as number[]
}

// ────────────────────────────────────────────────────────────────────────────
// Cosine similarity
// ────────────────────────────────────────────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

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
// File parser
// ────────────────────────────────────────────────────────────────────────────
async function parseFile(filePath: string): Promise<{ text: string; warning?: string }> {
  const ext = path.extname(filePath).toLowerCase()

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const buffer = fs.readFileSync(filePath)

  switch (ext) {
    case '.pdf': {
      const data = await pdfParse(buffer)
      const text = data.text?.trim() ?? ''
      if (!text) {
        return {
          text: '',
          warning: 'PDF appears to be image-only or encrypted — no extractable text found.'
        }
      }
      return { text }
    }

    case '.docx': {
      const result = await mammoth.extractRawText({ buffer })
      return { text: result.value ?? '' }
    }

    case '.xlsx':
    case '.xls': {
      const workbook = xlsx.read(buffer, { type: 'buffer' })
      let text = ''
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName]
        text += `Sheet: ${sheetName}\n${xlsx.utils.sheet_to_csv(sheet)}\n\n`
      })
      return { text }
    }

    case '.csv': {
      return { text: buffer.toString('utf-8') }
    }

    case '.txt':
    case '.md':
    case '.json':
      return { text: buffer.toString('utf-8') }

    default:
      throw new Error(`Unsupported file type: ${ext}`)
  }
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
      const { text, warning } = await parseFile(filePath)

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

      // 4 — Embed and store each chunk
      let i = 0
      for (const chunk of chunks) {
        const embedding = await getEmbedding(chunk)
        dbService.run(
          `INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), docId, chunk, JSON.stringify(embedding), i]
        )
        i++

        // Yield every 5 chunks so the Electron main process stays responsive
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
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
    }
  }

  public async searchSimilar(
    query: string,
    limit = 3,
    minScore = 0.25
  ): Promise<Array<{ id: string; document_id: string; content: string; score: number }>> {
    console.log(`[RAG] Searching: "${query}"`)

    const queryEmbedding = await getEmbedding(query)

    // Load all chunks from SQLite (brute-force cosine search — fast enough up to ~50k chunks)
    const allChunks = dbService.all(
      `SELECT id, document_id, content, embedding FROM document_chunks`
    ) as Array<{ id: string; document_id: string; content: string; embedding: string }>

    if (allChunks.length === 0) {
      return []
    }

    const scored = allChunks.map(row => {
      const embedding = JSON.parse(row.embedding) as number[]
      return {
        id: row.id,
        document_id: row.document_id,
        content: row.content,
        score: cosineSimilarity(queryEmbedding, embedding)
      }
    })

    // Sort descending, filter below threshold, return top K
    return scored
      .sort((a, b) => b.score - a.score)
      .filter(c => c.score >= minScore)
      .slice(0, limit)
  }

  public getDocuments() {
    return dbService.all(
      `SELECT id, filename, filepath, mimetype, size_bytes, chunk_count, indexed_at, status, metadata FROM documents ORDER BY indexed_at DESC`
    )
  }

  public deleteDocument(docId: string) {
    // Cascade deletes document_chunks via FK constraint
    dbService.run(`DELETE FROM documents WHERE id = ?`, [docId])
    return { success: true }
  }
}

export const documentService = new DocumentService()
