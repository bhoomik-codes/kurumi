import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'
import { dbService } from './DatabaseService'
import { pipeline, env } from '@xenova/transformers'

// Disable local models for transformers to avoid path issues, let it download from HF
env.allowLocalModels = false
env.useBrowserCache = false

class DocumentService {
  private extractor: any = null

  // Lazy load the embedding model to save memory until needed
  private async getExtractor() {
    if (!this.extractor) {
      console.log('Loading embedding model (Xenova/all-MiniLM-L6-v2)...')
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true, // Use quantized for speed and smaller memory
      })
      console.log('Embedding model loaded.')
    }
    return this.extractor
  }

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
      const extractor = await this.getExtractor()
      
      let i = 0
      for (const chunk of chunks) {
        // Run model
        const output = await extractor(chunk, { pooling: 'mean', normalize: true })
        // output.data is Float32Array
        const embeddingArray = Array.from(output.data)
        const embeddingString = JSON.stringify(embeddingArray)

        dbService.run(
          `INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), docId, chunk, embeddingString, i]
        )
        i++
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
    const extractor = await this.getExtractor()
    const queryOutput = await extractor(query, { pooling: 'mean', normalize: true })
    const queryEmbedding = Array.from(queryOutput.data) as number[]

    // Fetch all chunks (this is brute force, but very fast for personal local usage with <10k chunks)
    const allChunks = dbService.all(`SELECT id, document_id, content, embedding FROM document_chunks`) as any[]
    
    const scoredChunks = allChunks.map(chunk => {
      const dbEmbedding = JSON.parse(chunk.embedding)
      const score = this.cosineSimilarity(queryEmbedding, dbEmbedding)
      return {
        id: chunk.id,
        document_id: chunk.document_id,
        content: chunk.content,
        score
      }
    })

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
