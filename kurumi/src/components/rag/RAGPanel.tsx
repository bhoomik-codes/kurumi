import React from 'react'
import { FileText, Trash2 } from 'lucide-react'

export interface RAGDocument {
  id: string
  filename: string
  size_bytes: number
  chunk_count: number
  indexed_at: number
  status: string
}

interface RAGPanelProps {
  documents: RAGDocument[]
  onDelete: (docId: string) => void
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function RAGPanel({ documents, onDelete }: RAGPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="rounded-xl p-4 flex flex-col relative group transition-colors border"
          style={{
            backdropFilter: 'blur(16px)',
            background: 'var(--bg-glass)',
            borderColor: 'var(--red-vein)',
          }}
        >
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
                  {formatBytes(doc.size_bytes)}{' '}
                  {doc.indexed_at ? `• ${new Date(doc.indexed_at).toLocaleDateString()}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDelete(doc.id)}
              className="p-1.5 text-text-dim hover:text-red-bright hover:bg-red-core/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
              title="Remove from Knowledge Base"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="mt-auto pt-3 flex items-center justify-between text-xs">
            <span
              className={`px-2 py-0.5 rounded-full ${
                doc.status === 'indexed'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : doc.status === 'error'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}
            >
              {doc.status}
            </span>
            <span className="text-text-secondary">{doc.chunk_count} chunks</span>
          </div>
        </div>
      ))}
    </div>
  )
}
