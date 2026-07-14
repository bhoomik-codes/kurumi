import React, { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useChatStore, Message } from '../stores/chatStore'
import { useModelStore } from '../stores/modelStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useVoiceStore } from '../stores/voiceStore'
import ChatInput from '../components/chat/ChatInput'
import MessageBubble from '../components/chat/MessageBubble'
import ConversationSidebar from '../components/chat/ConversationSidebar'
import { KURUMI_SYSTEM_PROMPT } from '../constants/systemPrompt'
import { Loader2, Cpu, ChevronDown, Zap, HardDrive, Brain } from 'lucide-react'

// ── Provider badge colours ──────────────────────────────────────────────────
const PROVIDER_STYLES = {
  ollama:  { label: 'Local · Ollama',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  nvidia:  { label: 'Cloud · NVIDIA',  color: 'bg-green-400/10 text-green-300 border-green-400/20'       },
  airllm:  { label: 'Local · AirLLM',  color: 'bg-purple-500/10 text-purple-400 border-purple-500/20'    },
}

export default function Chat() {
  const parseMetadata = (raw: unknown) => {
    if (!raw) return undefined
    if (typeof raw === 'object') return raw
    if (typeof raw !== 'string') return undefined
    try {
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  }

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

  const {
    activeModel, setActiveModel, setAvailableModels,
    isModelWarming, warmingProgress
  } = useModelStore()

  const {
    loadFromDB, defaultModel, modelParams, ragTopK, ragMinScore,
    nvidiaApiKey, activeProvider, setSetting
  } = useSettingsStore()

  const [nvidiaModels, setNvidiaModels] = useState<{ id: string; label: string; tag: string; available: boolean }[]>([])
  const [nvidiaModel, setNvidiaModel] = useState<string>('')
  const [nvidiaProbing, setNvidiaProbing] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showUnavailable, setShowUnavailable] = useState(false)
  // AirLLM state
  const [airllmOnline, setAirllmOnline] = useState(false)
  const [airllmModel, setAirllmModel] = useState<string>('')
  const [airllmChecking, setAirllmChecking] = useState(false)
  const [lastAssistantMsg, setLastAssistantMsg] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const { loadVoicePrefs } = useVoiceStore()

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Boot sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      await loadFromDB()
      await loadVoicePrefs()

      // Load Ollama models (embedding models already filtered in backend)
      const models = await window.electron?.invoke('ollama:models')
      if (models?.length) {
        setAvailableModels(models)
        const savedDefault = await window.electron?.invoke('settings:get', 'defaultModel') as string | null
        setActiveModel(savedDefault ?? models[0].name)
      }

      // Load NVIDIA models if key is stored (probes availability in parallel)
      const savedKey = await window.electron?.invoke('settings:get', 'nvidiaApiKey') as string | null
      if (savedKey) {
        setNvidiaProbing(true)
        const nModels = await window.electron?.invoke('nvidia:models', savedKey)
        setNvidiaProbing(false)
        if (nModels?.length) {
          setNvidiaModels(nModels)
          const savedNvModel = await window.electron?.invoke('settings:get', 'nvidiaActiveModel') as string | null
          // Default to first AVAILABLE model
          const firstAvail = nModels.find((m: any) => m.available)
          setNvidiaModel(savedNvModel ?? firstAvail?.id ?? nModels[0].id)
        }
      }

      // Probe AirLLM server (non-blocking, silent if offline)
      setAirllmChecking(true)
      try {
        const airStatus = await window.electron?.invoke('airllm:status') as { ok: boolean; model?: string } | null
        if (airStatus?.ok) {
          setAirllmOnline(true)
          const airModels = await window.electron?.invoke('airllm:models') as { id: string; label: string }[] | null
          const firstModel = airModels?.[0]?.id ?? airStatus.model ?? ''
          setAirllmModel(firstModel)
        }
      } catch { /* server offline — ignore */ }
      setAirllmChecking(false)

      // Load saved provider
      const savedProvider = await window.electron?.invoke('settings:get', 'activeProvider') as string | null
      if (savedProvider === 'nvidia' || savedProvider === 'ollama' || savedProvider === 'airllm') {
        setSetting('activeProvider', savedProvider as any)
      }

      // Hydrate conversations
      const convs = await window.electron?.invoke('db:conversations:list') as any[]
      if (convs?.length) {
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
          setMessages(latest.id, msgs.map((m: any) => ({
            id: m.id,
            conversationId: m.conversation_id,
            role: m.role,
            content: m.content,
            model: m.model,
            createdAt: m.created_at,
            tokenCount: m.token_count,
            generationMs: m.generation_ms,
            metadata: parseMetadata(m.metadata),
          })))
        }
      }
    }
    boot()
  }, [])

  const currentMessages = activeConversationId ? (messages[activeConversationId] || []) : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages.length, streamingContent])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (content: string) => {
    const isNvidia = activeProvider === 'nvidia'
    const isAirLLM = activeProvider === 'airllm'
    const currentModel = isNvidia ? nvidiaModel : isAirLLM ? airllmModel : activeModel

    if (!currentModel) {
      alert(isNvidia ? 'Please select an NVIDIA model.' : isAirLLM ? 'AirLLM server is offline. Run airllm_server.py first.' : 'Please select a model first.')
      return
    }
    if (isNvidia && !nvidiaApiKey) {
      alert('Add your NVIDIA API key in Settings first.')
      return
    }
    if (isAirLLM && !airllmOnline) {
      alert('AirLLM server is offline.\n\nRun: python airllm_server.py\n\nThen refresh KURUMI.')
      return
    }

    let conversationId = activeConversationId
    if (!conversationId) {
      conversationId = uuidv4()
      const newConv = {
        id: conversationId,
        title: content.slice(0, 30) + (content.length > 30 ? '…' : ''),
        model: currentModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinned: false
      }
      await window.electron?.invoke('db:conversations:create', newConv)
      addConversation(newConv)
      setActiveConversation(conversationId)
    }

    const userMsg: Message = {
      id: uuidv4(), conversationId, role: 'user', content, createdAt: Date.now()
    }
    addMessage(userMsg)
    await window.electron?.invoke('db:messages:insert', userMsg)

    const replyId = uuidv4()
    clearStreaming()
    setIsStreaming(true)

    // RAG context injection
    let systemPromptWithContext = KURUMI_SYSTEM_PROMPT
    let ragSources: Array<{ filename: string; chunk_index: number; score: number }> = []
    try {
      const hasChunks = await window.electron?.invoke('docs:hasChunks')
      if (hasChunks) {
        const chunks = await window.electron?.invoke('rag:search', content, {
          topK: ragTopK,
          minScore: ragMinScore,
        }) as any[]
        if (chunks?.length) {
          const good = chunks.filter((c: any) => c.score >= ragMinScore)
          if (good.length) {
            ragSources = good.map((c: any) => ({
              filename: c.filename ?? 'Unknown',
              chunk_index: c.chunk_index ?? -1,
              score: c.score,
            }))
            systemPromptWithContext +=
              `\n\n**DOCUMENT CONTEXT:**\nRelevant context from user's local knowledge base:\n\n${good.map((c: any) => c.content).join('\n\n---\n\n')}\n\nUse this context to answer if relevant.`
          }
        }
      }
    } catch (err) {
      console.error('Vector search failed:', err)
    }

    const history = [
      { role: 'system', content: systemPromptWithContext },
      ...[...currentMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
    ]

    if (isNvidia) {
      // ── NVIDIA path ────────────────────────────────────────────────────
      const unsubChunk = window.electron?.on(`nvidia:chat:chunk:${replyId}`, (_e, chunk: any) => {
        if (chunk.content) updateStreamingContent(chunk.content, false)
      })
      const unsubDone = window.electron?.on(`nvidia:chat:done:${replyId}`, async () => {
        const { streamingContent: sc } = useChatStore.getState()
        const finalContent = sc.trim() || '_(No response received — model returned empty output. Check terminal for [NVIDIA] logs.)_'
        const sourceBlock = ragSources.length
          ? `\n\n### Sources\n${ragSources
              .map((s) => `- \`${s.filename}\` (chunk ${s.chunk_index})`)
              .join('\n')}`
          : ''
        const msg: Message = {
          id: replyId, conversationId: conversationId!, role: 'assistant',
          content: `${finalContent}${sourceBlock}`, model: nvidiaModel, createdAt: Date.now(),
          metadata: ragSources.length ? { sources: ragSources } : undefined,
        }
        addMessage(msg)
        clearStreaming()
        await window.electron?.invoke('db:messages:insert', msg)
        setLastAssistantMsg(msg.content)
        if (unsubChunk) unsubChunk()
        if (unsubDone) unsubDone()
        if (unsubErr) unsubErr()
      })
      const unsubErr = window.electron?.on(`nvidia:chat:error:${replyId}`, (_e, errMsg: string) => {
        console.error('[NVIDIA] Stream error received in renderer:', errMsg)
        const errContent = `⚠️ **NVIDIA API Error**\n\n\`\`\`\n${errMsg}\n\`\`\`\n\n_Check your API key in Settings or try a different model._`
        const errBubble: Message = {
          id: replyId, conversationId: conversationId!, role: 'assistant',
          content: errContent, model: nvidiaModel, createdAt: Date.now()
        }
        addMessage(errBubble)
        clearStreaming()
        void window.electron?.invoke('db:messages:insert', errBubble)
        if (unsubChunk) unsubChunk()
        if (unsubDone) unsubDone()
        if (unsubErr) unsubErr()
      })
      window.electron?.send('nvidia:chat:stream', {
        messages: history,
        model: nvidiaModel,
        apiKey: nvidiaApiKey,
        replyId,
        options: { temperature: modelParams.temperature, top_p: modelParams.top_p }
      })
    } else if (isAirLLM) {
      // ── AirLLM path (local big-model streaming server) ─────────────────
      const unsubChunk = window.electron?.on(`airllm:chat:chunk:${replyId}`, (_e, chunk: any) => {
        if (chunk.content) updateStreamingContent(chunk.content, false)
      })
      const unsubDone = window.electron?.on(`airllm:chat:done:${replyId}`, async () => {
        const { streamingContent: sc } = useChatStore.getState()
        const finalContent = sc.trim() || '_(No response received — check terminal running airllm_server.py)_'
        const sourceBlock = ragSources.length
          ? `\n\n### Sources\n${ragSources
              .map((s) => `- \`${s.filename}\` (chunk ${s.chunk_index})`)
              .join('\n')}`
          : ''
        const msg: Message = {
          id: replyId, conversationId: conversationId!, role: 'assistant',
          content: `${finalContent}${sourceBlock}`, model: airllmModel, createdAt: Date.now(),
          metadata: ragSources.length ? { sources: ragSources } : undefined,
        }
        addMessage(msg)
        clearStreaming()
        await window.electron?.invoke('db:messages:insert', msg)
        setLastAssistantMsg(msg.content)
        if (unsubChunk) unsubChunk()
        if (unsubDoneA) unsubDoneA()
        if (unsubErrA) unsubErrA()
      })
      const unsubDoneA = unsubDone
      const unsubErrA = window.electron?.on(`airllm:chat:error:${replyId}`, (_e, errMsg: string) => {
        console.error('[AirLLM] Stream error received in renderer:', errMsg)
        const errContent = `⚠️ **AirLLM Error**\n\n\`\`\`\n${errMsg}\n\`\`\`\n\n_Make sure airllm_server.py is running in a terminal._`
        const errBubble: Message = {
          id: replyId, conversationId: conversationId!, role: 'assistant',
          content: errContent, model: airllmModel, createdAt: Date.now()
        }
        addMessage(errBubble)
        clearStreaming()
        void window.electron?.invoke('db:messages:insert', errBubble)
        if (unsubChunk) unsubChunk()
        if (unsubDoneA) unsubDoneA()
        if (unsubErrA) unsubErrA()
      })
      window.electron?.send('airllm:chat:stream', {
        messages: history,
        model: airllmModel,
        replyId,
        options: { temperature: modelParams.temperature, top_p: modelParams.top_p, max_tokens: 512 }
      })
    } else {
      // ── Ollama path ────────────────────────────────────────────────────
      const unsubChunk = window.electron?.on(`ollama:chat:chunk:${replyId}`, (_e, chunk: any) => {
        if (chunk.message?.content) updateStreamingContent(chunk.message.content, chunk.done)
      })
      const unsubDone = window.electron?.on(`ollama:chat:done:${replyId}`, async (_e, chunk: any) => {
        const { streamingContent: sc } = useChatStore.getState()
        const sourceBlock = ragSources.length
          ? `\n\n### Sources\n${ragSources
              .map((s) => `- \`${s.filename}\` (chunk ${s.chunk_index})`)
              .join('\n')}`
          : ''
        const msg: Message = {
          id: replyId, conversationId: conversationId!, role: 'assistant',
          content: `${sc}${sourceBlock}`, model: activeModel!, createdAt: Date.now(),
          tokenCount: chunk.eval_count,
          generationMs: chunk.eval_duration ? Math.round(chunk.eval_duration / 1000000) : undefined,
          metadata: ragSources.length ? { sources: ragSources } : undefined,
        }
        addMessage(msg)
        clearStreaming()
        await window.electron?.invoke('db:messages:insert', msg)
        setLastAssistantMsg(msg.content)
        if (unsubChunk) unsubChunk()
        if (unsubDone) unsubDone()
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
  }

  const handleAbort = () => {
    if (activeProvider === 'nvidia') {
      window.electron?.send('nvidia:chat:abort')
    } else if (activeProvider === 'airllm') {
      window.electron?.send('airllm:chat:abort')
    } else {
      window.electron?.send('ollama:chat:abort')
    }
    clearStreaming()
  }

  const switchProvider = (p: 'ollama' | 'nvidia' | 'airllm') => {
    setSetting('activeProvider', p as any)
    window.electron?.invoke('settings:set', 'activeProvider', p)
  }

  const providerStyle = PROVIDER_STYLES[activeProvider]

  return (
    <div className="flex h-full">
      <ConversationSidebar />

      <div className="flex flex-col flex-1 bg-void/50 min-w-0">
        {/* Header */}
        <div className="h-12 border-b border-border-glass glass-deep flex items-center justify-between px-5 flex-shrink-0 gap-3">

          {/* Active model name */}
          <h1 className="font-display text-sm text-text-primary tracking-wide truncate">
            {activeProvider === 'nvidia'
              ? (nvidiaModel || 'Select NVIDIA Model')
              : activeProvider === 'airllm'
                ? (airllmModel ? `AirLLM · ${airllmModel.split('/').pop()}` : 'AirLLM (offline)')
                : (activeModel || 'Select a Model')}
          </h1>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Warming indicator */}
            {isModelWarming && activeProvider === 'ollama' && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2.5 py-1 animate-pulse">
                <Loader2 size={11} className="animate-spin" />
                {warmingProgress || 'Loading…'}
              </div>
            )}

            {/* Provider toggle */}
            <div className="flex items-center rounded-lg border border-border-glass overflow-hidden text-xs">
              <button
                onClick={() => switchProvider('ollama')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-all ${
                  activeProvider === 'ollama'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-text-dim hover:text-text-secondary hover:bg-white/5'
                }`}
              >
                <HardDrive size={11} />
                Local
              </button>
              <div className="w-px h-4 bg-border-glass" />
              <button
                onClick={() => switchProvider('nvidia')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-all ${
                  activeProvider === 'nvidia'
                    ? 'bg-green-400/20 text-green-300'
                    : nvidiaApiKey
                      ? 'text-text-dim hover:text-text-secondary hover:bg-white/5'
                      : 'text-text-dim/30 cursor-not-allowed'
                }`}
                disabled={!nvidiaApiKey}
                title={!nvidiaApiKey ? 'Add NVIDIA API key in Settings' : 'Switch to NVIDIA Cloud'}
              >
                <Zap size={11} />
                NVIDIA
              </button>
              <div className="w-px h-4 bg-border-glass" />
              <button
                onClick={() => airllmOnline && switchProvider('airllm')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-all ${
                  activeProvider === 'airllm'
                    ? 'bg-purple-500/20 text-purple-400'
                    : airllmOnline
                      ? 'text-text-dim hover:text-text-secondary hover:bg-white/5'
                      : 'text-text-dim/30 cursor-not-allowed'
                }`}
                disabled={!airllmOnline}
                title={airllmOnline
                  ? `AirLLM server online — ${airllmModel}`
                  : airllmChecking
                    ? 'Checking AirLLM server…'
                    : 'AirLLM server offline — run airllm_server.py'}
              >
                {airllmChecking
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Brain size={11} />}
                AirLLM
              </button>
            </div>

            {/* NVIDIA model picker */}
            {activeProvider === 'nvidia' && (
              nvidiaProbing ? (
                <div className="flex items-center gap-1.5 text-xs text-text-dim px-2">
                  <Loader2 size={11} className="animate-spin" />
                  Checking availability…
                </div>
              ) : nvidiaModels.length > 0 ? (
                <div className="relative" ref={pickerRef}>
                  <button
                    onClick={() => setShowModelPicker(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-text-secondary bg-white/5 border border-border-glass rounded-lg px-2.5 py-1.5 hover:border-green-400/40 hover:text-text-primary transition-all max-w-52"
                  >
                    <span className="truncate">{nvidiaModel.split('/')[1] ?? nvidiaModel}</span>
                    <ChevronDown size={11} className="flex-shrink-0" />
                  </button>

                  {showModelPicker && (() => {
                    const visible = showUnavailable
                      ? nvidiaModels
                      : nvidiaModels.filter(m => m.available)
                    const unavailCount = nvidiaModels.filter(m => !m.available).length
                    return (
                      <div className="absolute right-0 top-full mt-1 w-80 bg-abyss border border-border-glass rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                        {/* Filter toggle header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border-glass bg-black/20">
                          <span className="text-xs text-text-dim">
                            {nvidiaModels.filter(m => m.available).length} available
                          </span>
                          {unavailCount > 0 && (
                            <button
                              onClick={() => setShowUnavailable(v => !v)}
                              className="text-xs text-text-dim hover:text-text-secondary transition-colors"
                            >
                              {showUnavailable ? `Hide ${unavailCount} unavailable` : `Show ${unavailCount} unavailable`}
                            </button>
                          )}
                        </div>

                        {/* Model list */}
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {visible.length === 0 ? (
                            <div className="px-4 py-6 text-xs text-text-dim text-center">
                              No available models detected.<br/>
                              <button onClick={() => setShowUnavailable(true)} className="underline mt-1">Show all</button>
                            </div>
                          ) : (
                            visible.map(m => (
                              <button
                                key={m.id}
                                disabled={!m.available}
                                onClick={() => {
                                  if (!m.available) return
                                  setNvidiaModel(m.id)
                                  window.electron?.invoke('settings:set', 'nvidiaActiveModel', m.id)
                                  setShowModelPicker(false)
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                                  !m.available
                                    ? 'opacity-40 cursor-not-allowed'
                                    : nvidiaModel === m.id
                                      ? 'text-green-400 bg-green-400/5'
                                      : 'text-text-secondary hover:bg-white/5'
                                }`}
                              >
                                <span className="truncate">{m.label || m.id.split('/')[1]}</span>
                                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                  <span className="text-xs text-text-dim">{m.tag}</span>
                                  {m.available
                                    ? <span className="w-1.5 h-1.5 rounded-full bg-green-400" title="Available" />
                                    : <span className="w-1.5 h-1.5 rounded-full bg-red-500/50" title="Not on your plan" />}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-dim gap-3">
              <div className="text-4xl opacity-30">🩸</div>
              <p className="text-lg font-display">The void awaits your query…</p>
              <span className={`text-xs px-3 py-1 rounded-full border ${providerStyle.color}`}>
                {providerStyle.label}
              </span>
              {isModelWarming && activeProvider === 'ollama' && (
                <p className="text-xs text-yellow-400/70 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  {warmingProgress}
                </p>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {currentMessages.map(msg => (
                <MessageBubble key={msg.id} role={msg.role} content={msg.content} metadata={msg.metadata} />
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
            disabled={
              activeProvider === 'ollama'  ? !activeModel :
              activeProvider === 'airllm' ? !airllmOnline :
              (!nvidiaModel || !nvidiaApiKey)
            }
            newAssistantMessage={lastAssistantMsg}
          />
        </div>
      </div>
    </div>
  )
}
