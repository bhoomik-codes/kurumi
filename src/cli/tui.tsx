import React, { useState, useEffect, useRef } from 'react'
import { render, Box, Text } from 'ink'
import TextInput from 'ink-text-input'

const DAEMON_URL = 'http://127.0.0.1:47392'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const ChatApp = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [model, setModel] = useState('llama3:8b') // Default
  const [provider, setProvider] = useState('ollama')

  const handleSubmit = async (val: string) => {
    const text = val.trim()
    if (!text) return

    if (text === '/exit' || text === '/quit') {
      process.exit(0)
    }

    if (text === '/clear') {
      setMessages([])
      setQuery('')
      return
    }

    if (text.startsWith('/model ')) {
      const newModel = text.slice(7).trim()
      setModel(newModel)
      setQuery('')
      setMessages(m => [...m, { role: 'assistant', content: `Switched model to ${newModel}` }])
      return
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setQuery('')
    setIsGenerating(true)

    // Add empty assistant message to append to
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(`${DAEMON_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            } catch { /* ignore parsing errors */ }
          }
        }
      }
    } catch (err: any) {
      setMessages(m => [...m, { role: 'assistant', content: `[Error: ${err.message}]` }])
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">KURUMI</Text>
        <Text color="gray"> - Connected to {model} via {provider}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.map((m, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text bold color={m.role === 'user' ? 'blue' : 'green'}>
              {m.role === 'user' ? 'You' : 'Kurumi'}
            </Text>
            <Text>{m.content}</Text>
          </Box>
        ))}
        {messages.length === 0 && (
          <Text color="gray">Type a message or use commands: /clear, /model &lt;name&gt;, /exit</Text>
        )}
      </Box>

      <Box>
        <Box marginRight={1}>
          <Text color="yellow">❯</Text>
        </Box>
        {isGenerating ? (
          <Text color="gray">Generating...</Text>
        ) : (
          <TextInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
          />
        )}
      </Box>
    </Box>
  )
}

export function runTui() {
  render(<ChatApp />)
}
