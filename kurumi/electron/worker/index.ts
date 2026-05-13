/**
 * RAG utility process entry — heavy parsing, embeddings, and LanceDB live here
 * so the browser/main UI thread stays responsive.
 */
import { createEmbeddingRuntime, defaultHfCachePath } from '../services/embeddingRuntime'
import { VectorStoreCore } from '../services/vectorStoreCore'
import { runDelete, runIndexDocument, runSearch, type WorkerRuntime } from './ragWorkerTasks'

const userDataRoot = process.env.KURUMI_USER_DATA
if (!userDataRoot) {
  console.error('[RAG worker] KURUMI_USER_DATA is not set')
}

let rt: WorkerRuntime | null = null

function ensureRuntime(): WorkerRuntime {
  if (!userDataRoot) {
    throw new Error('RAG worker missing KURUMI_USER_DATA')
  }
  if (!rt) {
    const embed = createEmbeddingRuntime(defaultHfCachePath(userDataRoot))
    const store = new VectorStoreCore(userDataRoot)
    rt = { embed, store }
  }
  return rt
}

async function handleMessage(raw: unknown): Promise<void> {
  const msg = raw as Record<string, unknown>
  const type = msg.type as string

  const rpcId = msg.rpcId as string | undefined

  if (type === 'shutdown') {
    try {
      rt?.embed.unload()
      rt?.store.close()
    } finally {
      rt = null
    }
    if (rpcId) {
      process.parentPort.postMessage({ type: 'rpc-result', rpcId, ok: true, payload: {} })
    } else {
      process.parentPort.postMessage({ type: 'shutdown-done' })
    }
    return
  }

  if (!rpcId) return

  const replyOk = (payload: unknown) => {
    process.parentPort.postMessage({ type: 'rpc-result', rpcId, ok: true, payload })
  }
  const replyErr = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.parentPort.postMessage({ type: 'rpc-result', rpcId, ok: false, error: message })
  }

  if (type === 'health-check') {
    try {
      if (!userDataRoot) {
        replyErr(new Error('KURUMI_USER_DATA missing'))
        return
      }
      const probeStore = new VectorStoreCore(userDataRoot)
      try {
        await probeStore.ping()
      } finally {
        probeStore.close()
      }
      replyOk({ ok: true })
    } catch (e) {
      replyErr(e)
    }
    return
  }

  try {
    const runtime = ensureRuntime()

    if (type === 'index-file') {
      const docId = msg.docId as string
      const filePath = msg.filePath as string
      const filename = msg.filename as string

      const result = await runIndexDocument(
        runtime,
        { docId, filePath, filename },
        (done, total) => {
          process.parentPort.postMessage({
            type: 'indexing-progress',
            docId,
            filename,
            done,
            total,
            pct: total > 0 ? Math.round((done / total) * 100) : 0,
          })
        }
      )
      runtime.embed.unload()
      replyOk(result)
      return
    }

    if (type === 'search-vector') {
      const query = msg.query as string
      const topK = msg.topK as number
      const minScore = msg.minScore as number
      const indexedDocumentIds = msg.indexedDocumentIds as string[]
      const rows = await runSearch(runtime, {
        query,
        topK,
        minScore,
        indexedDocumentIds,
      })
      replyOk(rows)
      return
    }

    if (type === 'delete-document') {
      const docId = msg.docId as string
      await runDelete(runtime, docId)
      replyOk({})
      return
    }

    replyErr(new Error(`Unknown task: ${type}`))
  } catch (e) {
    if (rpcId) {
      const message = e instanceof Error ? e.message : String(e)
      process.parentPort.postMessage({ type: 'rpc-result', rpcId, ok: false, error: message })
    }
  }
}

process.parentPort.on('message', (ev: { data: unknown }) => {
  void handleMessage(ev.data)
})

process.on('uncaughtException', (err) => {
  console.error('[RAG worker] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[RAG worker] unhandledRejection:', reason)
})

process.parentPort.postMessage({ type: 'ready' })
