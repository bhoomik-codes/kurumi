import { ipcMain } from 'electron'
import { dbService } from '../services/DatabaseService'

export function registerSqliteIpc() {
  // Conversations
  ipcMain.handle('db:conversations:list', () => {
    return dbService.all('SELECT * FROM conversations ORDER BY updated_at DESC')
  })

  ipcMain.handle('db:conversations:create', (e, args) => {
    const { id, title, model, system_prompt, created_at, updated_at, metadata } = args
    dbService.run(
      'INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, model, system_prompt, created_at, updated_at, metadata]
    )
    return id
  })

  ipcMain.handle('db:conversations:update', (e, args) => {
    const { id, title, updated_at, metadata } = args
    dbService.run('UPDATE conversations SET title = ?, updated_at = ?, metadata = ? WHERE id = ?', [
      title, updated_at, metadata, id,
    ])
  })

  ipcMain.handle('db:conversations:delete', (e, id) => {
    dbService.run('DELETE FROM conversations WHERE id = ?', [id])
  })

  // Messages
  ipcMain.handle('db:messages:list', (e, conversationId) => {
    return dbService.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId])
  })

  ipcMain.handle('db:messages:insert', (e, args) => {
    const { id, conversation_id, role, content, model, created_at, token_count, generation_ms, attachments, metadata } = args
    dbService.run(
      'INSERT INTO messages (id, conversation_id, role, content, model, created_at, token_count, generation_ms, attachments, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, conversation_id, role, content, model, created_at, token_count, generation_ms, attachments, metadata]
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
}
