import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  model?: string
  createdAt: number
  tokenCount?: number
  generationMs?: number
  attachments?: any[]
  metadata?: any
}

export interface Conversation {
  id: string
  title: string
  model: string
  systemPrompt?: string
  createdAt: number
  updatedAt: number
  pinned: boolean
  folderId?: string
  metadata?: any
}

interface ChatState {
  conversations: Conversation[]
  messages: Record<string, Message[]> // keyed by conversationId
  activeConversationId: string | null
  isStreaming: boolean
  streamingContent: string
  
  // Actions
  setActiveConversation: (id: string | null) => void
  addConversation: (conv: Conversation) => void
  addMessage: (msg: Message) => void
  updateStreamingContent: (content: string, done: boolean) => void
  clearStreaming: () => void
  setConversations: (convs: Conversation[]) => void
  setMessages: (convId: string, msgs: Message[]) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  isStreaming: false,
  streamingContent: '',

  setActiveConversation: (id) => set({ activeConversationId: id }),
  
  addConversation: (conv) => set((state) => ({
    conversations: [conv, ...state.conversations]
  })),

  addMessage: (msg) => set((state) => {
    const convMsgs = state.messages[msg.conversationId] || []
    return {
      messages: {
        ...state.messages,
        [msg.conversationId]: [...convMsgs, msg]
      }
    }
  }),

  updateStreamingContent: (content, done) => set((state) => ({
    streamingContent: state.streamingContent + content,
    isStreaming: !done
  })),

  clearStreaming: () => set({ streamingContent: '', isStreaming: false }),

  setConversations: (convs) => set({ conversations: convs }),

  setMessages: (convId, msgs) => set((state) => ({
    messages: {
      ...state.messages,
      [convId]: msgs
    }
  }))
}))
