import { connect, type Connection, type Table } from '@lancedb/lancedb'
import { mkdirSync } from 'fs'
import { join } from 'path'

export interface VectorSearchResult {
  id: string
  document_id: string
  filename: string
  content: string
  chunk_index: number
  score: number
}

const TABLE_NAME = 'chunks'

function distanceToScore(distance: number): number {
  return 1 - distance
}

function sqlQuote(id: string): string {
  return `'${id.replace(/'/g, "''")}'`
}

/** LanceDB-backed store without SQLite; indexed doc scope is supplied per search by the caller. */
export class VectorStoreCore {
  private readonly storageDir: string
  private db: Connection | null = null
  private table: Table | null = null
  private readonly readyChain: Promise<void>

  constructor(userDataRoot: string) {
    this.storageDir = join(userDataRoot, 'vectorstore')
    mkdirSync(this.storageDir, { recursive: true })
    this.readyChain = this.connectDb()
  }

  getStorageDir() {
    return this.storageDir
  }

  private async connectDb(): Promise<void> {
    this.db = await connect(this.storageDir)
  }

  private async ensureDb(): Promise<Connection> {
    await this.readyChain
    if (!this.db) throw new Error('LanceDB connection failed')
    return this.db
  }

  /** Opens the local Lance connection — verifies native bindings and disk path. */
  async ping(): Promise<void> {
    await this.ensureDb()
  }

  private async openTableIfExists(): Promise<Table | null> {
    const conn = await this.ensureDb()
    const names = await conn.tableNames()
    if (!names.includes(TABLE_NAME)) return null
    if (this.table?.isOpen()) return this.table
    this.table = await conn.openTable(TABLE_NAME)
    return this.table
  }

  async insertChunk(params: {
    id: string
    documentId: string
    filename?: string
    content: string
    embedding: number[]
    chunkIndex: number
  }): Promise<void> {
    const conn = await this.ensureDb()
    const metadata = JSON.stringify({
      document_id: params.documentId,
      filename: params.filename ?? '',
      page_index: params.chunkIndex,
    })
    const row = {
      id: params.id,
      vector: Float32Array.from(params.embedding),
      content: params.content,
      document_id: params.documentId,
      metadata,
    }

    let tbl = await this.openTableIfExists()
    if (!tbl) {
      tbl = await conn.createTable(TABLE_NAME, [row])
      this.table = tbl
      return
    }
    await tbl.add([row])
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    const tbl = await this.openTableIfExists()
    if (!tbl) return
    await tbl.delete(`document_id = ${sqlQuote(documentId)}`)
  }

  async search(
    queryEmbedding: number[],
    topK: number,
    minScore: number,
    indexedDocumentIds: string[]
  ): Promise<VectorSearchResult[]> {
    const tbl = await this.openTableIfExists()
    if (!tbl || indexedDocumentIds.length === 0) return []

    const maxDistance = 1 - minScore
    const poolLimit = Math.min(2000, Math.max(topK * 20, 80))

    const inList = indexedDocumentIds.map(sqlQuote).join(', ')
    const queryVec = Float32Array.from(queryEmbedding)

    const rows = await tbl
      .vectorSearch(queryVec)
      .column('vector')
      .distanceType('cosine')
      .where(`document_id IN (${inList})`)
      .distanceRange(0, maxDistance)
      .limit(poolLimit)
      .select(['id', 'content', 'metadata', 'document_id', '_distance'])
      .toArray()

    const scored: VectorSearchResult[] = []
    for (const row of rows) {
      const dist = Number(row._distance)
      if (!Number.isFinite(dist)) continue
      const score = distanceToScore(dist)
      let filename = ''
      let chunk_index = 0
      try {
        const meta = JSON.parse(String(row.metadata ?? '{}')) as {
          filename?: string
          page_index?: number
        }
        filename = meta.filename ?? ''
        chunk_index = meta.page_index ?? 0
      } catch {
        /* keep defaults */
      }
      scored.push({
        id: String(row.id),
        document_id: String(row.document_id ?? ''),
        filename,
        content: String(row.content ?? ''),
        chunk_index,
        score,
      })
    }

    scored.sort((a, b) => b.score - a.score)

    if (scored.length <= topK) return scored

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

  close(): void {
    try {
      this.table?.close()
    } catch {
      /* ignore */
    }
    this.table = null
    try {
      this.db?.close()
    } catch {
      /* ignore */
    }
    this.db = null
  }
}
