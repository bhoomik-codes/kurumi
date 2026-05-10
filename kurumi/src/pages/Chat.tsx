import React, { useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useChatStore, Message } from '../stores/chatStore'
import { useModelStore } from '../stores/modelStore'
import { useSettingsStore } from '../stores/settingsStore'
import ChatInput from '../components/chat/ChatInput'
import MessageBubble from '../components/chat/MessageBubble'
import ConversationSidebar from '../components/chat/ConversationSidebar'
import { KURUMI_SYSTEM_PROMPT } from '../constants/systemPrompt'
import { Loader2, Cpu } from 'lucide-react'

export default function Chat() {
  const {
    messages,
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

  const { activeModel, setActiveModel, setAvailableModels, isModelWarming, warmingProgress } = useModelStore()
  const { loadFromDB, defaultModel, modelParams, ragTopK, ragMinScore } = useSettingsStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Boot sequence: load settings → fetch models → restore default model ──
  useEffect(() => {
    const boot = async () => {
      // 1. Load persisted settings
      await loadFromDB()

      // 2. Fetch available models (embedding models already filtered server-side)
      const models = await window.electron?.invoke('ollama:models')
      if (models && models.length > 0) {
        setAvailableModels(models)

        // 3. Re-read default model (loadFromDB may have just set it in the store)
        const savedDefault = await window.electron?.invoke('settings:get', 'defaultModel') as string | null
        const target = savedDefault ?? models[0].name
        // skipWarmup=false → triggers background warmup
        setActiveModel(target)
      }

      // 4. Hydrate conversations from DB
      const convs = await window.electron?.invoke('db:conversations:list') as any[]
      if (convs && convs.length > 0) {
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
        const latest = mapped[0]
        setActiveConversation(latest.id)
        const msgs = await window.electron?.invoke('db:messages:list', latest.id) as any[]
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
      }
    }
    boot()
  }, [])

  const currentMessages = activeConversationId ? (messages[activeConversationId] || []) : []

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages.length, streamingContent])

  const handleSendMessage = async (content: string) => {
    if (!activeModel) {
      alert('Please select a model first.')
      return
    }

    let conversationId = activeConversationId

    // Create a new conversation if none exists
    if (!conversationId) {
      conversationId = uuidv4()
      const newConv = {
        id: conversationId,
        title: content.slice(0, 30) + (content.length > 30 ? '…' : ''),
        model: activeModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinned: false
      }
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
    setIsStreaming(true)

    // ── RAG: only embed query if documents exist ──
    let systemPromptWithContext = KURUMI_SYSTEM_PROMPT
    try {
      const hasChunks = await window.electron?.invoke('docs:hasChunks')
      if (hasChunks) {
        const relevantChunks = await window.electron?.invoke('docs:search', content, ragTopK) as any[]
        if (relevantChunks && relevantChunks.length > 0) {
          const good = relevantChunks.filter((c: any) => c.score >= ragMinScore)
          if (good.length > 0) {
            const contextText = good.map((c: any) => c.content).join('\n\n---\n\n')
            systemPromptWithContext +=
              `\n\n**DOCUMENT CONTEXT:**\nRelevant context from user's local knowledge base:\n\n${contextText}\n\nUse this context to answer if relevant.`
          }
        }
      }
    } catch (err) {
      console.error('Vector search failed:', err)
    }

    // Build history
    const history = [
      { role: 'system', content: systemPromptWithContext },
      ...[...currentMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
    ]

    // Start streaming
    const unsubscribeChunk = window.electron?.on(`ollama:chat:chunk:${replyId}`, (_event, chunk: any) => {
      if (chunk.message?.content) {
        updateStreamingContent(chunk.message.content, chunk.done)
      }
    })

    const unsubscribeDone = window.electron?.on(`ollama:chat:done:${replyId}`, async (_event, chunk: any) => {
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
      options: {
        temperature:    modelParams.temperature,
        top_p:          modelParams.top_p,
        top_k:          modelParams.top_k,
        repeat_penalty: modelParams.repeat_penalty,
        num_ctx:        modelParams.num_ctx,
      },
      replyId
    })
  }

  const handleAbort = () => {
    window.electron?.send('ollama:chat:abort')
    clearStreaming()
  }

  return (
    <div className="flex h-full">
      <ConversationSidebar />

      <div className="flex flex-col flex-1 bg-void/50 min-w-0">
        {/* Header */}
        <div className="h-12 border-b border-border-glass glass-deep flex items-center justify-between px-5 flex-shrink-0">
          <h1 className="font-display text-sm text-text-primary tracking-wide truncate">
            {activeModel || 'Select a Model'}
          </h1>

          {/* Model warming indicator */}
          {isModelWarming && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1 animate-pulse">
              <Loader2 size={12} className="animate-spin" />
              {warmingProgress || 'Loading model…'}
            </div>
          )}
          {!isModelWarming && warmingProgress === 'Model ready' && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1">
              <Cpu size={12} />
              Model ready
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-dim gap-3">
              <div className="text-4xl opacity-30">🩸</div>
              <p className="text-lg font-display">The void awaits your query…</p>
              {isModelWarming && (
                <p className="text-xs text-yellow-400/70 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  {warmingProgress}
                </p>
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
