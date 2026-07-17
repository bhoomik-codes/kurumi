import React, { useState, useEffect, useRef } from 'react'
import { render, Box, Text, useApp, useInput } from 'ink'
import { Splash } from './components/Splash'
import { Footer } from './components/Footer'
import { InputArea } from './components/InputArea'
import { MessageList, Message } from './components/MessageList'

const daemonPort = process.env.KURUMI_DAEMON_PORT || '47392'
const daemonHost = process.env.KURUMI_DAEMON_HOST || '127.0.0.1'
const DAEMON_URL = `http://${daemonHost}:${daemonPort}`

interface TuiOptions {
  systemInstructions?: string | null
  loadedInstructionFiles?: string[]
}

export const ChatApp = ({ systemInstructions, loadedInstructionFiles }: TuiOptions) => {
  const { exit } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [model, setModel] = useState('llama3:8b')
  const [provider, setProvider] = useState('ollama')
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Double Ctrl+C to exit logic
  const [exitPresses, setExitPresses] = useState(0)
  
  useInput((char, key) => {
    if (key.ctrl && char === 'c') {
      if (exitPresses >= 1) {
        exit()
      } else {
        setExitPresses(1)
        setTimeout(() => setExitPresses(0), 1000) // Reset after 1s
      }
    } else {
      setExitPresses(0)
    }
  })

  useEffect(() => {
    const initialMsgs: Message[] = []
    if (systemInstructions) {
      initialMsgs.push({ role: 'system', content: systemInstructions })
    }
    if (loadedInstructionFiles && loadedInstructionFiles.length > 0) {
      initialMsgs.push({ 
        role: 'assistant', 
        content: `*Loaded system instructions from:*\n${loadedInstructionFiles.map(f => `- \`${f}\``).join('\n')}`
      })
    }
    setMessages(initialMsgs)
  }, [systemInstructions, loadedInstructionFiles])

  const handleInterrupt = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (text: string) => {
    if (text === '/exit' || text === '/quit') {
      exit()
      return
    }

    if (text === '/clear') {
      setMessages(systemInstructions ? [{ role: 'system', content: systemInstructions }] : [])
      return
    }

    if (text === '/help') {
      setMessages(m => [...m, 
        { role: 'user', content: text },
        { role: 'assistant', content: `**KURUMI Help**\n- \`/help\`: Show this message\n- \`/clear\`: Clear chat\n- \`/about\`: Show version\n- \`/quit\`: Exit\n- \`/models\`: (Coming soon)\n- \`@path\`: (Coming soon)\n- \`!cmd\`: (Coming soon)` }
      ])
      return
    }

    if (text === '/about') {
      setMessages(m => [...m, 
        { role: 'user', content: text },
        { role: 'assistant', content: `KURUMI v1.0.0 — Cursed Blood Edition` }
      ])
      return
    }

    const newMessages = [...messages, { role: 'user', content: text } as Message]
    setMessages(newMessages)
    setIsGenerating(true)

    // Add empty assistant message to append to
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch(`${DAEMON_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          provider,
          model,
          messages: newMessages
        })
      })

      if (!res.ok || !res.body) {
        throw new Error(`Server returned ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    last.content += parsed.content
                  }
                  return updated
                })
              }
              if (parsed.done) {
                break
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(m => [...m, { role: 'assistant', content: `**[Error: ${err.message}]**` }])
      } else {
        setMessages(m => {
          const updated = [...m]
          const last = updated[updated.length - 1]
          if (last && last.role === 'assistant') {
            last.content += '\n\n*(Generation interrupted)*'
          }
          return updated
        })
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  // Calculate context usage (dummy logic for now, Phase 2 will improve)
  const ctxTokens = messages.reduce((acc, m) => acc + m.content.length / 4, 0)
  const contextUsage = Math.min(100, Math.round((ctxTokens / 8192) * 100))

  return (
    <Box flexDirection="column" padding={1}>
      {messages.length <= (systemInstructions ? 1 : 0) && <Splash />}

      <MessageList messages={messages} />

      {exitPresses > 0 && (
        <Text color="yellow">Press Ctrl+C again to exit</Text>
      )}

      <InputArea 
        onSubmit={handleSubmit} 
        onInterrupt={handleInterrupt}
        isGenerating={isGenerating}
      />
      
      <Footer 
        cwd={process.cwd()} 
        provider={provider} 
        model={model} 
        contextUsage={contextUsage} 
      />
    </Box>
  )
}

export function runTui(options: TuiOptions = {}) {
  render(<ChatApp {...options} />)
}
