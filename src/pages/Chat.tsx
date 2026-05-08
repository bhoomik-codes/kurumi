import React, { useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useChatStore, Message } from '../stores/chatStore'
import { useModelStore } from '../stores/modelStore'
import ChatInput from '../components/chat/ChatInput'
import MessageBubble from '../components/chat/MessageBubble'
import ConversationSidebar from '../components/chat/ConversationSidebar'

export default function Chat() {
  const { 
    messages,
    conversations,
    activeConversationId, 
    isStreaming, 
    streamingContent,
    addMessage, 
    updateStreamingContent, 
    clearStreaming,
    setIsStreaming,
    setActiveConversation,
    addConversation,
    setConversations,
    setMessages
  } = useChatStore()
  
  const { activeModel, setActiveModel } = useModelStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Hydrate from DB on first mount
  useEffect(() => {
    window.electron?.invoke('db:conversations:list').then((convs: any[]) => {
      if (convs && convs.length > 0) {
        // Map snake_case from SQLite to camelCase for the store
        const mapped = convs.map((c: any) => ({
          id: c.id,
          title: c.title,
          model: c.model,
          systemPrompt: c.system_prompt,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          pinned: !!c.pinned,
        }))
        setConversations(mapped)
        // Load messages for the most recent conversation
        const latest = mapped[0]
        setActiveConversation(latest.id)
        window.electron?.invoke('db:messages:list', latest.id).then((msgs: any[]) => {
          if (msgs) {
            const mappedMsgs = msgs.map((m: any) => ({
              id: m.id,
              conversationId: m.conversation_id,
              role: m.role,
              content: m.content,
              model: m.model,
              createdAt: m.created_at,
              tokenCount: m.token_count,
              generationMs: m.generation_ms,
            }))
            setMessages(latest.id, mappedMsgs)
          }
        })
      }
    })
  }, [])

  useEffect(() => {
    // Auto-select first model
    if (!activeModel) {
      window.electron?.invoke('ollama:models').then((models) => {
        if (models && models.length > 0) {
          setActiveModel(models[0].name)
        }
      })
    }
  }, [activeModel])
  
  const currentMessages = activeConversationId ? (messages[activeConversationId] || []) : []

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages.length, streamingContent])

  const handleSendMessage = async (content: string) => {
    if (!activeModel) {
      alert("Please select a model first.")
      return
    }

    let conversationId = activeConversationId

    // Create a new conversation if none exists
    if (!conversationId) {
      conversationId = uuidv4()
      const newConv = {
        id: conversationId,
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        model: activeModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinned: false
      }
      
      // Save to SQLite
      await window.electron?.invoke('db:conversations:create', newConv)
      
      addConversation(newConv)
      setActiveConversation(conversationId)
    }

    // Add user message
    const userMsg: Message = {
      id: uuidv4(),
      conversationId,
      role: 'user',
      content,
      createdAt: Date.now()
    }
    addMessage(userMsg)
    await window.electron?.invoke('db:messages:insert', userMsg)

    // Setup assistant reply
    const replyId = uuidv4()
    clearStreaming()
    setIsStreaming(true) // show loading bubble immediately

    // Format history for Ollama
    const history = [...currentMessages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }))

    // Start streaming
    const unsubscribeChunk = window.electron?.on(`ollama:chat:chunk:${replyId}`, (event, chunk: any) => {
      if (chunk.message?.content) {
        updateStreamingContent(chunk.message.content, chunk.done)
      }
    })

    const unsubscribeDone = window.electron?.on(`ollama:chat:done:${replyId}`, async (event, chunk: any) => {
      // Finalize message
      const { streamingContent } = useChatStore.getState()
      
      const assistantMsg: Message = {
        id: replyId,
        conversationId: conversationId!,
        role: 'assistant',
        content: streamingContent,
        model: activeModel,
        createdAt: Date.now(),
        tokenCount: chunk.eval_count,
        generationMs: chunk.eval_duration ? Math.round(chunk.eval_duration / 1000000) : undefined
      }
      
      addMessage(assistantMsg)
      clearStreaming()
      await window.electron?.invoke('db:messages:insert', assistantMsg)
      
      if (unsubscribeChunk) unsubscribeChunk()
      if (unsubscribeDone) unsubscribeDone()
    })

    window.electron?.send('ollama:chat:stream', {
      messages: history,
      model: activeModel,
      options: {},
      replyId
    })
  }

  const handleAbort = () => {
    window.electron?.send('ollama:chat:abort')
    clearStreaming()
    // Ideally, we'd still save whatever we generated so far here
  }

  return (
    <div className="flex h-full">
      {/* Conversation Sidebar */}
      <ConversationSidebar />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 bg-void/50 min-w-0">
        {/* Header */}
        <div className="h-12 border-b border-border-glass glass-deep flex items-center px-5 flex-shrink-0">
          <h1 className="font-display text-sm text-text-primary tracking-wide truncate">
            {activeModel || 'Select a Model'}
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-dim gap-3">
              <div className="text-4xl opacity-30">🩸</div>
              <p className="text-lg font-display">The void awaits your query...</p>
              {!activeConversationId && (
                <p className="text-xs opacity-50">Start a new conversation or select one from the sidebar</p>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {currentMessages.map(msg => (
                <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && (
                <MessageBubble role="assistant" content={streamingContent} isStreaming />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 max-w-3xl mx-auto w-full flex-shrink-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            onAbort={handleAbort}
            isStreaming={isStreaming}
            disabled={!activeModel}
          />
        </div>
      </div>
    </div>
  )
}
