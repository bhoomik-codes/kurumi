import { dbService } from './DatabaseService'

/** SQLite-backed document catalog only — indexing / vectors run in the RAG utility process. */
class DocumentService {
  public getDocuments() {
    return dbService.all(
      `SELECT id, filename, filepath, mimetype, size_bytes, chunk_count, indexed_at, status, metadata FROM documents ORDER BY indexed_at DESC`
    )
  }
}

export const documentService = new DocumentService()
