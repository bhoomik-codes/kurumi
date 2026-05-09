import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Upload, FileText, Trash2, Database, AlertCircle } from 'lucide-react'

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

  useEffect(() => {
    loadDocuments()
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

    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File & { path: string }
      const docId = uuidv4()
      
      try {
        await window.electron?.invoke('docs:process', {
          docId,
          filePath: file.path,
          filename: file.name,
          mimetype: file.type,
          sizeBytes: file.size
        })
        setUploadProgress(((i + 1) / files.length) * 100)
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="glass-default border border-white/5 rounded-xl p-4 flex flex-col relative group hover:border-red-core/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-red-core/10 flex items-center justify-center flex-shrink-0 border border-red-core/20">
                      <FileText size={20} className="text-red-bright" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-text-primary font-medium truncate" title={doc.filename}>
                        {doc.filename}
                      </h3>
                      <p className="text-xs text-text-dim mt-0.5">
                        {formatBytes(doc.size_bytes)} • {new Date(doc.indexed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-text-dim hover:text-red-bright hover:bg-red-core/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from Knowledge Base"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-auto pt-3 flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${
                    doc.status === 'indexed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    doc.status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    {doc.status}
                  </span>
                  <span className="text-text-secondary">
                    {doc.chunk_count} chunks
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
