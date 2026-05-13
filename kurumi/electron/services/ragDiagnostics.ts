import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export function getRagWorkerLogPath(): string {
  return join(app.getPath('userData'), 'logs', 'rag-worker.log')
}

/** Append one line to persistent RAG diagnostics (survives packaged builds; failures are swallowed). */
export function appendRagWorkerLog(line: string): void {
  try {
    const dir = join(app.getPath('userData'), 'logs')
    mkdirSync(dir, { recursive: true })
    const ts = new Date().toISOString()
    appendFileSync(getRagWorkerLogPath(), `[${ts}] ${line}\n`, 'utf8')
  } catch {
    /* ignore */
  }
}
