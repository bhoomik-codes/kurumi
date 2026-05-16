import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

class DatabaseService {
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'kurumi.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('foreign_keys = ON')
    this.initSchema()
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL DEFAULT 'New Chat',
        model       TEXT NOT NULL,
        system_prompt TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        pinned      INTEGER DEFAULT 0,
        folder_id   TEXT,
        metadata    TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id              TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role            TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
        content         TEXT NOT NULL,
        model           TEXT,
        created_at      INTEGER NOT NULL,
        token_count     INTEGER,
        generation_ms   INTEGER,
        attachments     TEXT,
        metadata        TEXT
      );

      CREATE TABLE IF NOT EXISTS folders (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        color      TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id          TEXT PRIMARY KEY,
        filename    TEXT NOT NULL,
        filepath    TEXT NOT NULL,
        mimetype    TEXT NOT NULL,
        size_bytes  INTEGER,
        chunk_count INTEGER DEFAULT 0,
        indexed_at  INTEGER,
        status      TEXT DEFAULT 'pending',
        metadata    TEXT
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id          TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        content     TEXT NOT NULL,
        embedding   TEXT NOT NULL,
        chunk_index INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

      -- Key-value settings store
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prompts (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        content     TEXT NOT NULL,
        category    TEXT,
        variables   TEXT,
        created_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS personas (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        model         TEXT,
        temperature   REAL DEFAULT 0.7,
        avatar_emoji  TEXT DEFAULT '🔴',
        created_at    INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS image_generations (
        id          TEXT PRIMARY KEY,
        prompt      TEXT NOT NULL,
        neg_prompt  TEXT,
        model       TEXT,
        settings    TEXT NOT NULL,
        image_path  TEXT NOT NULL,
        created_at  INTEGER NOT NULL,
        conversation_id TEXT
      );

      -- FTS5 Virtual Table for full text search
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        content,
        content=messages,
        content_rowid=rowid
      );

      -- Triggers for FTS updates
      CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
      END;
      CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      END;
      CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
        INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
      END;
    `)
  }

  // Generic query runner
  public run(sql: string, params: any[] = []) {
    return this.db.prepare(sql).run(params)
  }

  public get(sql: string, params: any[] = []) {
    return this.db.prepare(sql).get(params)
  }

  public all(sql: string, params: any[] = []) {
    return this.db.prepare(sql).all(params)
  }

  public iterate(sql: string, params: any[] = []) {
    return this.db.prepare(sql).iterate(params)
  }
}

export const dbService = new DatabaseService()
