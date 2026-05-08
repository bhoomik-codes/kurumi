import React, { useState } from 'react'
import { useChatStore, Conversation } from '../../stores/chatStore'
import { useModelStore } from '../../stores/modelStore'
import { Plus, MessageSquare, Trash2, Pin, Search, MoreVertical } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

interface ConversationItemProps {
  conv: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onPin: () => void
}

function ConversationItem({ conv, isActive, onSelect, onDelete, onPin }: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={`relative group rounded-lg mx-2 mb-1 px-3 py-2.5 cursor-pointer transition-all duration-150
        ${isActive
          ? 'bg-red-core/20 border border-red-core/40 shadow-[0_0_10px_rgba(139,0,0,0.2)]'
          : 'hover:bg-white/5 border border-transparent hover:border-white/5'
        }
      `}
      onClick={onSelect}
    >
      {/* Active indicator */}
      {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-red-bright rounded-r-full" />}

      {/* Pin indicator */}
      {conv.pinned && (
        <div className="absolute top-2 right-2">
          <Pin size={10} className="text-red-bright/60" fill="currentColor" />
        </div>
      )}

      <div className="flex items-start gap-2 pr-6">
        <MessageSquare size={14} className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-red-bright' : 'text-text-dim'}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium truncate leading-snug ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
            {conv.title || 'New Chat'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-dim">{formatRelativeTime(conv.updatedAt)}</span>
            {conv.model && (
              <span className="text-[10px] text-text-dim truncate">· {conv.model.split(':')[0]}</span>
            )}
          </div>
        </div>
      </div>

      {/* Context menu trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-text-dim transition-all"
      >
        <MoreVertical size={12} />
      </button>

      {/* Context menu */}
      {showMenu && (
        <div
          className="absolute right-2 top-8 z-50 bg-abyss border border-border-glass rounded-lg shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onPin(); setShowMenu(false) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary"
          >
            <Pin size={12} /> {conv.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            onClick={() => { onDelete(); setShowMenu(false) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-bright hover:bg-red-core/10"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function ConversationSidebar() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    addConversation,
    setConversations,
    setMessages,
    clearStreaming,
  } = useChatStore()

  const { activeModel } = useModelStore()
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const filtered = conversations.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  )

  const pinned = filtered.filter(c => c.pinned)
  const recent = filtered.filter(c => !c.pinned)

  const handleNewChat = () => {
    clearStreaming()
    setActiveConversation(null)
    setMessages('__new__', [])
  }

  const handleSelect = async (conv: Conversation) => {
    if (conv.id === activeConversationId) return
    clearStreaming()
    setActiveConversation(conv.id)

    // Load messages from DB
    const msgs = await window.electron?.invoke('db:messages:list', conv.id)
    if (msgs) {
      const mapped = msgs.map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role,
        content: m.content,
        model: m.model,
        createdAt: m.created_at,
        tokenCount: m.token_count,
        generationMs: m.generation_ms,
      }))
      setMessages(conv.id, mapped)
    }
  }

  const handleDelete = async (id: string) => {
    await window.electron?.invoke('db:conversations:delete', id)
    const updated = conversations.filter(c => c.id !== id)
    setConversations(updated)
    if (activeConversationId === id) {
      setActiveConversation(updated[0]?.id || null)
    }
  }

  const handlePin = async (conv: Conversation) => {
    const updated = conversations.map(c =>
      c.id === conv.id ? { ...c, pinned: !c.pinned } : c
    )
    setConversations(updated)
    await window.electron?.invoke('db:conversations:update', {
      id: conv.id,
      title: conv.title,
      updatedAt: conv.updatedAt,
    })
  }

  const renderGroup = (items: Conversation[], label?: string) => {
    if (items.length === 0) return null
    return (
      <div>
        {label && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-dim px-4 py-2">{label}</p>
        )}
        {items.map(conv => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            isActive={activeConversationId === conv.id}
            onSelect={() => handleSelect(conv)}
            onDelete={() => handleDelete(conv.id)}
            onPin={() => handlePin(conv)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="w-56 flex flex-col border-r border-border-glass bg-abyss/50 flex-shrink-0">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-border-glass flex-shrink-0">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Chats</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(s => !s)}
            className="p-1.5 rounded-lg text-text-dim hover:text-text-secondary hover:bg-white/5 transition-colors"
          >
            <Search size={13} />
          </button>
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-lg text-text-dim hover:text-red-bright hover:bg-red-core/10 transition-colors"
            title="New Chat"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-3 py-2 border-b border-border-glass">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-black/30 border border-border-glass rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-red-core/50"
          />
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-dim gap-2 px-4 text-center">
            <MessageSquare size={28} className="opacity-20" />
            <p className="text-xs">No conversations yet.</p>
            <p className="text-[10px] opacity-60">Start chatting to see history here.</p>
          </div>
        ) : (
          <>
            {renderGroup(pinned, pinned.length ? '📌 Pinned' : undefined)}
            {renderGroup(recent, pinned.length ? 'Recent' : undefined)}
          </>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-t border-border-glass flex-shrink-0">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium
            bg-red-core/15 text-red-bright border border-red-core/30
            hover:bg-red-core/30 hover:border-red-core/60 transition-all"
        >
          <Plus size={14} /> New Chat
        </button>
      </div>
    </div>
  )
}
