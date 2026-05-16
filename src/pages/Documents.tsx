import React, { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Upload, FileText, Database, AlertCircle } from 'lucide-react'
import RAGPanel from '../components/rag/RAGPanel'

interface Document {
  id: string
  filename: string
  filepath: string
  mimetype: string
  size_bytes: number
  chunk_count: number
  indexed_at: number
  status: string
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const uploadMetaRef = useRef({ fileIndex: 0, fileCount: 1 })

  useEffect(() => {
    loadDocuments()
  }, [])

  useEffect(() => {
    const unsub = window.electron?.on('rag:indexing-progress', (_e, p: { done?: number; total?: number }) => {
      const total = p?.total ?? 0
      if (total <= 0) return
      const { fileIndex, fileCount } = uploadMetaRef.current
      const chunkFrac = (p?.done ?? 0) / total
      const overall = ((fileIndex + chunkFrac) / Math.max(1, fileCount)) * 100
      setUploadProgress(Math.min(100, Math.round(overall)))
    })
    return () => {
      unsub?.()
    }
  }, [])

  const loadDocuments = async () => {
    const docs = await window.electron?.invoke('docs:list')
    if (docs) {
      setDocuments(docs)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    uploadMetaRef.current = { fileIndex: 0, fileCount: files.length }

    for (let i = 0; i < files.length; i++) {
      uploadMetaRef.current.fileIndex = i
      const file = files[i] as File & { path: string }
      const docId = uuidv4()

      try {
        await window.electron?.invoke('rag:index', {
          docId,
          filePath: file.path,
          filename: file.name,
          mimetype: file.type,
          sizeBytes: file.size
        })
        setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      } catch (err) {
        console.error('Failed to process document:', err)
      }
    }

    setIsUploading(false)
    loadDocuments()
    
    // reset input
    if (event.target) event.target.value = ''
  }

  const handleDelete = async (docId: string) => {
    if (confirm('Are you sure you want to delete this document from the knowledge base?')) {
      await window.electron?.invoke('docs:delete', docId)
      loadDocuments()
    }
  }

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <Database className="text-red-core" size={28} />
          Knowledge Base (RAG)
        </h1>
        <p className="text-text-secondary mt-2">
          Upload documents to build your local vector database. Kurumi will automatically retrieve relevant context when you ask questions.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="mb-8 relative group">
        <input 
          type="file" 
          multiple 
          onChange={handleFileUpload} 
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          accept=".pdf,.txt,.md,.csv,.xlsx,.docx,.json"
        />
        <div className={`
          border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300
          ${isUploading ? 'border-red-core bg-red-core/5' : 'border-border-glass bg-black/20 group-hover:border-red-core/50 group-hover:bg-red-core/5'}
        `}>
          <Upload size={48} className={`mb-4 ${isUploading ? 'text-red-bright animate-bounce' : 'text-text-dim group-hover:text-red-core transition-colors'}`} />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {isUploading ? 'Processing Documents...' : 'Drop documents here or click to browse'}
          </h3>
          <p className="text-sm text-text-secondary">
            Supports PDF, DOCX, XLSX, CSV, TXT, MD, JSON
          </p>

          {isUploading && (
            <div className="w-full max-w-md mt-6 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-red-core transition-all duration-300 relative"
                style={{ width: `${uploadProgress}%` }}
              >
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileText size={18} className="text-red-core" />
          Indexed Documents
        </h2>

        {documents.length === 0 && !isUploading ? (
          <div className="text-center py-12 glass-default rounded-xl border border-white/5">
            <AlertCircle size={32} className="mx-auto text-text-dim mb-3 opacity-50" />
            <p className="text-text-secondary">Your knowledge base is empty.</p>
          </div>
        ) : (
          <RAGPanel documents={documents} onDelete={handleDelete} />
        )}
      </div>
    </div>
  )
}
