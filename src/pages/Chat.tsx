import React, { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useChatStore, Message } from '../stores/chatStore'
import { useModelStore } from '../stores/modelStore'
import ChatInput from '../components/chat/ChatInput'
import MessageBubble from '../components/chat/MessageBubble'

export default function Chat() {
  const { 
    messages, 
    activeConversationId, 
    isStreaming, 
    streamingContent,
    addMessage, 
    updateStreamingContent, 
    clearStreaming,
    setActiveConversation,
    addConversation
  } = useChatStore()
  
  const { activeModel } = useModelStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
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

    window.electron?.invoke('ollama:chat:stream', {
      messages: history,
      model: activeModel,
      options: {},
      replyId
    })
  }

  const handleAbort = () => {
    window.electron?.invoke('ollama:chat:abort')
    clearStreaming()
    // Ideally, we'd still save whatever we generated so far here
  }

  return (
    <div className="flex flex-col h-full bg-void/50">
      {/* Header */}
      <div className="h-14 border-b border-border-glass glass-deep flex items-center px-6">
        <h1 className="font-display-dec text-lg text-text-primary tracking-wide">
          {activeModel || 'Select a Model'}
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {currentMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-dim text-lg font-display">
            The void awaits your query...
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
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
      <div className="p-4 max-w-4xl mx-auto w-full">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onAbort={handleAbort} 
          isStreaming={isStreaming} 
          disabled={!activeModel}
        />
      </div>
    </div>
  )
}
