import { ipcMain } from 'electron'
import { dbService } from '../services/DatabaseService'

export function registerSqliteIpc() {
  // Conversations
  ipcMain.handle('db:conversations:list', () => {
    return dbService.all('SELECT * FROM conversations ORDER BY updated_at DESC')
  })

  ipcMain.handle('db:conversations:create', async (e, args) => {
    const { id, title, model, systemPrompt, createdAt, updatedAt, metadata } = args
    await dbService.run(
      'INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, model, systemPrompt, createdAt, updatedAt, metadata]
    )
    return id
  })

  ipcMain.handle('db:conversations:update', async (e, args) => {
    const { id, title, updated_at, metadata } = args
    await dbService.run('UPDATE conversations SET title = ?, updated_at = ?, metadata = ? WHERE id = ?', [
      title, updated_at, metadata, id,
    ])
  })

  ipcMain.handle('db:conversations:delete', async (e, id) => {
    await dbService.run('DELETE FROM conversations WHERE id = ?', [id])
  })

  // Messages
  ipcMain.handle('db:messages:list', (e, conversationId) => {
    return dbService.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId])
  })

  ipcMain.handle('db:messages:insert', async (e, args) => {
    const { id, conversationId, role, content, model, createdAt, tokenCount, generationMs, attachments, metadata } = args
    const attachmentsValue =
      attachments == null || typeof attachments === 'string'
        ? attachments
        : JSON.stringify(attachments)
    const metadataValue =
      metadata == null || typeof metadata === 'string'
        ? metadata
        : JSON.stringify(metadata)
    await dbService.run(
      'INSERT INTO messages (id, conversation_id, role, content, model, created_at, token_count, generation_ms, attachments, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, conversationId, role, content, model, createdAt, tokenCount, generationMs, attachmentsValue, metadataValue]
    )
    return id
  })

  // FTS
  ipcMain.handle('db:messages:search', (e, query) => {
    return dbService.all(
      `SELECT m.*, c.title as conversation_title
       FROM messages_fts f
       JOIN messages m ON f.rowid = m.rowid
       JOIN conversations c ON m.conversation_id = c.id
       WHERE messages_fts MATCH ?
       ORDER BY rank LIMIT 50`,
      [query]
    )
  })

  // ─── Persistent Settings (KV) ─────────────────────────────────────────────
  ipcMain.handle('settings:get', async (_e, key: string) => {
    const row = await dbService.get('SELECT value FROM settings WHERE key = ?', [key]) as { value: string } | undefined
    return row ? JSON.parse(row.value) : null
  })

  ipcMain.handle('settings:set', async (_e, key: string, value: unknown) => {
    await dbService.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, JSON.stringify(value)]
    )
    return true
  })

  ipcMain.handle('settings:getAll', async () => {
    const rows = await dbService.all('SELECT key, value FROM settings') as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]))
  })
}
