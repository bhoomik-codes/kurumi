import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'
import { dbService } from './DatabaseService'

class DocumentService {
  // Configurable embedding model. Ensure this matches what you have in Ollama.
  private embeddingModel = 'qwen3' // 'nomic-embed-text' or 'qwen3'

  // Calculate cosine similarity
  private cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }
    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  // Generate embedding via HTTP directly to avoid package issues
  private async getEmbedding(prompt: string): Promise<number[]> {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embeddingModel, prompt })
    })
    
    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.embedding
  }

  // Basic chunking: split by paragraphs, then ensure max chunk length
  private chunkText(text: string, maxTokens = 500): string[] {
    const chunks: string[] = []
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)

    let currentChunk = ''
    for (const p of paragraphs) {
      // Rough approximation: 1 token = 4 chars
      if (currentChunk.length + p.length > maxTokens * 4) {
        if (currentChunk) chunks.push(currentChunk.trim())
        currentChunk = p + '\n\n'
      } else {
        currentChunk += p + '\n\n'
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim())
    return chunks
  }

  public async parseFile(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase()
    const buffer = fs.readFileSync(filePath)

    try {
      switch (ext) {
        case '.pdf':
          const pdfData = await pdfParse(buffer)
          return pdfData.text
        case '.docx':
          const result = await mammoth.extractRawText({ buffer })
          return result.value
        case '.xlsx':
        case '.csv':
          const workbook = xlsx.read(buffer, { type: 'buffer' })
          let text = ''
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName]
            const csv = xlsx.utils.sheet_to_csv(sheet)
            text += `Sheet: ${sheetName}\n${csv}\n\n`
          })
          return text
        case '.txt':
        case '.md':
        case '.json':
          return buffer.toString('utf-8')
        default:
          throw new Error(`Unsupported file type: ${ext}`)
      }
    } catch (err: any) {
      console.error(`Error parsing ${filePath}:`, err)
      throw new Error(`Failed to parse document: ${err.message}`)
    }
  }

  public async processDocument(docId: string, filePath: string, filename: string, mimetype: string, sizeBytes: number) {
    console.log(`Processing document: ${filename}`)

    // 1. Save metadata
    dbService.run(
      `INSERT INTO documents (id, filename, filepath, mimetype, size_bytes, status) VALUES (?, ?, ?, ?, ?, 'processing')`,
      [docId, filename, filePath, mimetype, sizeBytes]
    )

    try {
      // 2. Parse text
      const text = await this.parseFile(filePath)

      // 3. Chunk text
      const chunks = this.chunkText(text)

      // 4. Generate embeddings and save
      let i = 0
      for (const chunk of chunks) {
        const embeddingArray = await this.getEmbedding(chunk)
        const embeddingString = JSON.stringify(embeddingArray)

        dbService.run(
          `INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), docId, chunk, embeddingString, i]
        )
        i++

        // Yield to the event loop every 5 chunks to prevent "Not Responding" freeze
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      // 5. Update status
      dbService.run(
        `UPDATE documents SET chunk_count = ?, status = 'indexed', indexed_at = ? WHERE id = ?`,
        [chunks.length, Date.now(), docId]
      )

      console.log(`Document ${filename} processed successfully. Chunks: ${chunks.length}`)
      return { success: true, chunks: chunks.length }

    } catch (error: any) {
      dbService.run(`UPDATE documents SET status = 'error', metadata = ? WHERE id = ?`, [JSON.stringify({ error: error.message }), docId])
      throw error
    }
  }

  public async searchSimilar(query: string, limit: number = 3) {
    console.log(`Searching for: ${query}`)

    // Get embedding via HTTP
    const queryEmbedding = await this.getEmbedding(query)

    // Fetch all chunks at once. Using .iterate() with await inside the loop is unsafe in better-sqlite3 
    // because it keeps the DB statement open across event loop ticks, which can cause silent hangs.
    const allChunks = dbService.all(`SELECT id, document_id, content, embedding FROM document_chunks`) as any[]

    const scoredChunks: any[] = []
    let index = 0
    for (const chunk of allChunks) {
      const dbEmbedding = JSON.parse(chunk.embedding)
      const score = this.cosineSimilarity(queryEmbedding, dbEmbedding)
      scoredChunks.push({
        id: chunk.id,
        document_id: chunk.document_id,
        content: chunk.content,
        score
      })

      index++
      // Yield to the event loop every 500 chunks to prevent UI freezing
      // We use setImmediate which is much faster than setTimeout(0)
      if (index % 500 === 0) {
        await new Promise(resolve => setImmediate(resolve))
      }
    }

    // Sort by descending score
    scoredChunks.sort((a, b) => b.score - a.score)

    // Return top K
    return scoredChunks.slice(0, limit)
  }

  public getDocuments() {
    return dbService.all(`SELECT * FROM documents ORDER BY indexed_at DESC`)
  }

  public deleteDocument(docId: string) {
    dbService.run(`DELETE FROM documents WHERE id = ?`, [docId])
    return { success: true }
  }
}

export const documentService = new DocumentService()
