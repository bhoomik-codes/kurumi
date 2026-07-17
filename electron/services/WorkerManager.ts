import type { VectorSearchResult } from './vectorStoreCore'

import dotenv from 'dotenv';
dotenv.config();
const DAEMON_URL = `http://${process.env.KURUMI_DAEMON_HOST || '127.0.0.1'}:${process.env.KURUMI_DAEMON_PORT || '47392'}`

class WorkerManagerProxy {
  async runStartupHealthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${DAEMON_URL}/health`)
      return { ok: res.ok }
    } catch {
      return { ok: false, error: 'Daemon unreachable' }
    }
  }

  async processDocument(
    docId: string,
    filePath: string,
    filename: string,
    mimetype: string,
    sizeBytes: number
  ): Promise<{ success: boolean; chunks: number; warning?: string }> {
    const res = await fetch(`${DAEMON_URL}/worker/processDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, filePath, filename, mimetype, sizeBytes })
    })
    if (!res.ok) throw new Error('Worker RPC failed')
    return res.json()
  }

  async searchSimilar(query: string, limit = 3, minScore = 0.25): Promise<VectorSearchResult[]> {
    const res = await fetch(`${DAEMON_URL}/worker/searchSimilar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, minScore })
    })
    if (!res.ok) throw new Error('Worker RPC failed')
    return res.json()
  }

  async deleteDocument(docId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${DAEMON_URL}/worker/deleteDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId })
    })
    if (!res.ok) throw new Error('Worker RPC failed')
    return res.json()
  }

  async transcribeAudio(
    pcmData: number[],
    modelSize: 'tiny' | 'base' | 'small' = 'base',
    language = 'english'
  ): Promise<{ text: string; language?: string }> {
    const res = await fetch(`${DAEMON_URL}/worker/transcribeAudio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pcmData, modelSize, language })
    })
    if (!res.ok) throw new Error('Worker RPC failed')
    return res.json()
  }
}

export const workerManager = new WorkerManagerProxy()
