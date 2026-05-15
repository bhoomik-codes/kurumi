import { randomUUID } from 'crypto'
import { utilityProcess, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { dbService } from './DatabaseService'
import { appendRagWorkerLog } from './ragDiagnostics'
import type { VectorSearchResult } from './vectorStoreCore'

type UtilityChild = Electron.UtilityProcess

interface Pending {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
}

export class WorkerManager {
  private child: UtilityChild | null = null
  private workerReady = false
  private readonly pending = new Map<string, Pending>()
  private spawnPromise: Promise<void> | null = null

  private workerScriptPath(): string {
    return join(__dirname, 'worker.js')
  }

  private teardownChildState(): void {
    this.child = null
    this.workerReady = false
    this.spawnPromise = null
  }

  private routeFromWorker(msg: unknown): void {
    const m = msg as Record<string, unknown>
    const type = m.type as string

    if (type === 'indexing-progress') {
      const payload = {
        docId: m.docId as string,
        filename: m.filename as string | undefined,
        done: Number(m.done ?? 0),
        total: Number(m.total ?? 0),
        pct: typeof m.pct === 'number' ? m.pct : undefined,
      }
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('rag:indexing-progress', payload)
      }
      return
    }

    if (type === 'rpc-result') {
      const rpcId = m.rpcId as string
      const pending = this.pending.get(rpcId)
      if (!pending) return
      this.pending.delete(rpcId)
      if (m.ok === true) {
        pending.resolve(m.payload)
      } else {
        pending.reject(new Error(String(m.error ?? 'RAG worker error')))
      }
    }
  }

  private onWorkerExit(code: number): void {
    console.warn(`[RAG worker] exited with code ${code}`)
    appendRagWorkerLog(`Worker process exit code=${code}`)
    this.teardownChildState()
    for (const [, p] of this.pending) {
      p.reject(new Error('RAG worker process terminated unexpectedly'))
    }
    this.pending.clear()
  }

  async ensureWorker(): Promise<void> {
    if (this.child && this.workerReady) return
    if (this.spawnPromise) {
      await this.spawnPromise
      return
    }

    this.spawnPromise = this.doSpawn()
    try {
      await this.spawnPromise
    } finally {
      if (!this.workerReady) {
        this.spawnPromise = null
      }
    }
  }

  private async doSpawn(): Promise<void> {
    const workerPath = this.workerScriptPath()
    appendRagWorkerLog(
      `Spawning utility process script=${workerPath} userData=${app.getPath('userData')} packaged=${app.isPackaged}`
    )
    const env: Record<string, string> = {
      ...process.env,
      KURUMI_USER_DATA: app.getPath('userData'),
    } as Record<string, string>

    if (app.isPackaged) {
      env.NODE_PATH = join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
    }

    const child = utilityProcess.fork(workerPath, [], {
      env,
      serviceName: 'KURUMI RAG Worker',
      stdio: 'pipe',
    })

    this.child = child

    child.stdout?.on('data', (d) => {
      if (process.env.KURUMI_DEBUG_WORKER) {
        process.stdout.write(d)
      }
    })
    child.stderr?.on('data', (d) => {
      const text = d.toString()
      process.stderr.write(d)
      const trimmed = text.trim()
      if (trimmed) appendRagWorkerLog(`[stderr] ${trimmed}`)
    })

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('RAG worker startup timed out'))
      }, 120_000)

      const onMessage = (msg: unknown) => {
        const m = msg as { type?: string }
        if (m?.type === 'ready') {
          clearTimeout(timeout)
          child.off('message', onMessage)
          child.off('exit', onEarlyExit)
          this.workerReady = true
          resolve()
        }
      }
      const onEarlyExit = (code: number) => {
        clearTimeout(timeout)
        child.off('message', onMessage)
        reject(new Error(`RAG worker exited before ready (code ${code})`))
      }

      child.on('message', onMessage)
      child.once('exit', onEarlyExit)
    })

    child.on('message', (msg) => this.routeFromWorker(msg))
    child.on('exit', (code) => this.onWorkerExit(code))
  }

  /** Spawn worker if needed and verify LanceDB native bindings + vector store path (lightweight). */
  async runStartupHealthCheck(): Promise<{ ok: boolean; error?: string }> {
    appendRagWorkerLog('Startup health check (LanceDB ping) starting')
    try {
      await this.rpc<{ ok: boolean }>({ type: 'health-check' })
      appendRagWorkerLog('Startup health check OK')
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      appendRagWorkerLog(`Startup health check FAILED: ${msg}`)
      return { ok: false, error: msg }
    }
  }

  private async rpc<T>(payload: Record<string, unknown>): Promise<T> {
    await this.ensureWorker()
    if (!this.child || !this.workerReady) {
      throw new Error('RAG worker unavailable')
    }

    const rpcId = randomUUID()
    return await new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(rpcId)
        reject(new Error('RAG worker RPC timed out'))
      }, 600_000)

      this.pending.set(rpcId, {
        resolve: (v) => {
          clearTimeout(t)
          resolve(v as T)
        },
        reject: (e) => {
          clearTimeout(t)
          reject(e)
        },
      })

      try {
        this.child!.postMessage({ ...payload, rpcId })
      } catch (e) {
        clearTimeout(t)
        this.pending.delete(rpcId)
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  async processDocument(
    docId: string,
    filePath: string,
    filename: string,
    mimetype: string,
    sizeBytes: number
  ): Promise<{ success: boolean; chunks: number; warning?: string }> {
    console.log(`[RAG] Processing document (worker): ${filename}`)

    dbService.run(
      `INSERT INTO documents (id, filename, filepath, mimetype, size_bytes, status) VALUES (?, ?, ?, ?, ?, 'processing')`,
      [docId, filename, filePath, mimetype, sizeBytes]
    )

    try {
      const result = (await this.rpc<{ chunks: number; warning?: string }>({
        type: 'index-file',
        docId,
        filePath,
        filename,
      })) as { chunks: number; warning?: string }

      if (result.chunks === 0) {
        dbService.run(
          `UPDATE documents SET chunk_count = 0, status = 'indexed', indexed_at = ?, metadata = ? WHERE id = ?`,
          [Date.now(), JSON.stringify({ warning: result.warning ?? 'No chunks indexed.' }), docId]
        )
        return { success: true, chunks: 0, warning: result.warning }
      }

      dbService.run(`UPDATE documents SET chunk_count = ?, status = 'indexed', indexed_at = ? WHERE id = ?`, [
        result.chunks,
        Date.now(),
        docId,
      ])
      console.log(`[RAG] ${filename} indexed successfully — ${result.chunks} chunks`)
      return { success: true, chunks: result.chunks }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[RAG] Failed to process ${filename}:`, error)
      dbService.run(`UPDATE documents SET status = 'error', metadata = ? WHERE id = ?`, [
        JSON.stringify({ error: message }),
        docId,
      ])
      throw error
    }
  }

  async searchSimilar(query: string, limit = 3, minScore = 0.25): Promise<VectorSearchResult[]> {
    console.log(`[RAG] Searching (worker): "${query}"`)

    const indexedRows = dbService.all(`SELECT id FROM documents WHERE status = 'indexed'`) as Array<{ id: string }>
    const indexedDocumentIds = indexedRows.map((r) => r.id)

    return (await this.rpc<VectorSearchResult[]>({
      type: 'search-vector',
      query,
      topK: limit,
      minScore,
      indexedDocumentIds,
    })) as VectorSearchResult[]
  }

  async deleteDocument(docId: string): Promise<{ success: boolean }> {
    await this.rpc({ type: 'delete-document', docId })
    dbService.run(`DELETE FROM documents WHERE id = ?`, [docId])
    return { success: true }
  }

  async transcribeAudio(
    pcmData: number[],
    modelSize: 'tiny' | 'base' | 'small' = 'base',
    language = 'english'
  ): Promise<{ text: string; language?: string }> {
    return this.rpc<{ text: string; language?: string }>({
      type: 'transcribe-audio',
      pcmData,
      modelSize,
      language,
    })
  }

  async shutdown(): Promise<void> {
    if (!this.child) return
    const child = this.child
    const rpcId = randomUUID()

    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        this.pending.delete(rpcId)
        try {
          child.kill()
        } catch {
          /* ignore */
        }
        this.teardownChildState()
        resolve()
      }, 8000)

      this.pending.set(rpcId, {
        resolve: () => {
          clearTimeout(t)
          this.teardownChildState()
          resolve()
        },
        reject: () => {
          clearTimeout(t)
          this.teardownChildState()
          resolve()
        },
      })

      try {
        child.postMessage({ type: 'shutdown', rpcId })
      } catch {
        clearTimeout(t)
        this.pending.delete(rpcId)
        try {
          child.kill()
        } catch {
          /* ignore */
        }
        this.teardownChildState()
        resolve()
      }
    })
  }
}

export const workerManager = new WorkerManager()
