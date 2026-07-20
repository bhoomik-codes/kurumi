import React, { useState, useEffect, useRef } from 'react'
import { render, Box, Text, useApp, useInput } from 'ink'
import { Splash } from './components/Splash'
import { Footer } from './components/Footer'
import { InputArea } from './components/InputArea'
import { MessageList, Message } from './components/MessageList'
import { ModelSwitcher } from './components/ModelSwitcher'
import { spawn } from 'child_process'
import kill from 'tree-kill'

const daemonPort = process.env.KURUMI_DAEMON_PORT || '47392'
const daemonHost = process.env.KURUMI_DAEMON_HOST || '127.0.0.1'
const DAEMON_URL = `http://${daemonHost}:${daemonPort}`

// Simple ANSI stripper regex
const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')

interface TuiOptions {
  systemInstructions?: string | null
  loadedInstructionFiles?: string[]
  warnings?: string[]
  initialModel?: string
  initialProvider?: string
}

export const ChatApp = ({ systemInstructions, loadedInstructionFiles, warnings, initialModel = 'llama3:8b', initialProvider = 'ollama' }: TuiOptions) => {
  const { exit } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [model, setModel] = useState(initialModel)
  const [provider, setProvider] = useState(initialProvider)
  const [showModelSwitcher, setShowModelSwitcher] = useState(false)
  const [securityPrompt, setSecurityPrompt] = useState<{ cmd: string } | null>(null)
  const [alwaysAllowExecution, setAlwaysAllowExecution] = useState(false)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const childProcessRef = useRef<any>(null)
  
  const [exitPresses, setExitPresses] = useState(0)
  
  useInput((char, key) => {
    if (securityPrompt) {
      if (char.toLowerCase() === 'n' || key.escape) {
        setMessages(m => [...m, { role: 'system-process', content: `[Execution denied]` }])
        setSecurityPrompt(null)
      } else if (char.toLowerCase() === 'a') {
        setAlwaysAllowExecution(true)
        setSecurityPrompt(null)
        executeCommand(securityPrompt.cmd)
      } else if (char.toLowerCase() === 'y' || key.return) {
        setSecurityPrompt(null)
        executeCommand(securityPrompt.cmd)
      }
      return
    }

    if (showModelSwitcher && key.escape) {
      setShowModelSwitcher(false)
      return
    }

    if (key.ctrl && char === 'c') {
      if (exitPresses >= 1) {
        exit()
      } else {
        setExitPresses(1)
        setTimeout(() => setExitPresses(0), 1000)
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
      let content = `*Loaded system instructions from:*\n${loadedInstructionFiles.map(f => `- \`${f}\``).join('\n')}`
      if (warnings && warnings.length > 0) {
        content += `\n\n**Warning:**\n${warnings.map(w => `- ${w}`).join('\n')}`
      }
      initialMsgs.push({ 
        role: 'assistant', 
        content
      })
    }
    setMessages(initialMsgs)
  }, [systemInstructions, loadedInstructionFiles, warnings])

  const handleInterrupt = () => {
    if (childProcessRef.current) {
      kill(childProcessRef.current.pid, 'SIGTERM', (err) => {
        if (err) console.error(err)
      })
      childProcessRef.current = null
      setIsGenerating(false)
    } else if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGenerating(false)
    }
  }

  const executeCommand = (cmd: string) => {
    setIsGenerating(true)
    setMessages(m => [...m, { role: 'system-process', content: '' }])
    
    const cp = spawn(cmd, { shell: true })
    childProcessRef.current = cp
    
    const appendOutput = (data: Buffer) => {
      const sanitized = stripAnsi(data.toString())
      setMessages(m => {
        const last = m[m.length - 1]
        if (last && last.role === 'system-process') {
          return [...m.slice(0, -1), { ...last, content: last.content + sanitized }]
        }
        return m
      })
    }

    cp.stdout.on('data', appendOutput)
    cp.stderr.on('data', appendOutput)
    cp.on('close', (code) => {
      setIsGenerating(false)
      childProcessRef.current = null
      setMessages(m => {
        const last = m[m.length - 1]
        if (last && last.role === 'system-process') {
          return [...m.slice(0, -1), { ...last, content: last.content + `\n[Process exited with code ${code}]` }]
        }
        return m
      })
    })
    cp.on('error', (err) => {
      setIsGenerating(false)
      childProcessRef.current = null
      setMessages(m => {
        const last = m[m.length - 1]
        if (last && last.role === 'system-process') {
          return [...m.slice(0, -1), { ...last, content: last.content + `\n[Error spawning process: ${err.message}]` }]
        }
        return m
      })
    })
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
        { role: 'assistant', content: `**KURUMI Help**\n- \`/help\`: Show this message\n- \`/clear\`: Clear chat\n- \`/about\`: Show version\n- \`/quit\`: Exit\n- \`/provider <name>\`: Switch provider (ollama, airllm, nvidia)\n- \`/model <name>\`: Switch model\n- \`/models\`: List models\n- \`@path\`: (Coming soon)\n- \`/execute <cmd>\` or \`!<cmd>\`: Execute shell command\n\n**Tips:**\n- **Multi-line input**: Type \`Ctrl+N\` or add a trailing backslash \`\\\` before hitting Enter.\n- **Exit**: Double \`Ctrl+C\` to quit immediately.` }
      ])
      return
    }

    if (text === '/models') {
      setShowModelSwitcher(true)
      return
    }
    
    let isExecute = false
    let cmdToRun = ''
    if (text.startsWith('/execute ')) {
      isExecute = true
      cmdToRun = text.slice(9).trim()
    } else if (text.startsWith('!')) {
      isExecute = true
      cmdToRun = text.slice(1).trim()
    }

    if (isExecute) {
      const userMessage: Message = { role: 'user', content: text }
      setMessages(m => [...m, userMessage])
      
      const isDestructive = /\b(rm|mv|sudo|dd|>|>>)\b/.test(cmdToRun)
      if (isDestructive && !alwaysAllowExecution) {
        setSecurityPrompt({ cmd: cmdToRun })
        return
      }
      executeCommand(cmdToRun)
      return
    }

    if (text.startsWith('/provider ')) {
      const newProvider = text.slice(10).trim()
      setProvider(newProvider)
      setMessages(m => [...m, 
        { role: 'user', content: text },
        { role: 'assistant', content: `**Provider set to:** \`${newProvider}\`` }
      ])
      return
    }

    if (text.startsWith('/model ')) {
      const newModel = text.slice(7).trim()
      setModel(newModel)
      setMessages(m => [...m, 
        { role: 'user', content: text },
        { role: 'assistant', content: `**Model set to:** \`${newModel}\`` }
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
            const dataStr = line.slice(6).trim()
            if (dataStr === '[DONE]') break
            let parsedData: any
            try {
              parsedData = JSON.parse(dataStr)
            } catch {
              continue
            }
            
            if (parsedData.error) throw new Error(parsedData.error)
            
            if (parsedData.content) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === 'assistant') {
                  last.content += parsedData.content
                }
                return updated
              })
            }
            if (parsedData.done) {
              break
            }
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
      <Splash />

      <MessageList messages={messages} />

      {exitPresses > 0 && (
        <Text color="yellow">Press Ctrl+C again to exit</Text>
      )}

      {showModelSwitcher ? (
        <ModelSwitcher 
          daemonUrl={DAEMON_URL} 
          onSelect={(newProvider, newModel) => {
            setProvider(newProvider)
            setModel(newModel)
            setShowModelSwitcher(false)
            setMessages(m => [...m, 
              { role: 'user', content: '/models' },
              { role: 'assistant', content: `**Switched to:** \`${newProvider}/${newModel}\`` }
            ])
          }}
          onCancel={() => setShowModelSwitcher(false)}
        />
      ) : securityPrompt ? (
        <Box borderStyle="round" borderColor="yellow" padding={1} flexDirection="column">
          <Text color="yellow" bold>Security Warning: Destructive command detected</Text>
          <Text>Command: <Text color="red">{securityPrompt.cmd}</Text></Text>
          <Box marginTop={1}>
            <Text dimColor>This uses best-effort pattern matching and is not a true sandbox.</Text>
          </Box>
          <Box marginTop={1}>
            <Text>
              <Text bold>Allow once</Text> (y) / <Text bold>Always allow</Text> (a) / <Text bold>Deny</Text> (n)
            </Text>
          </Box>
        </Box>
      ) : (
        <InputArea 
          onSubmit={handleSubmit} 
          onInterrupt={handleInterrupt}
          isGenerating={isGenerating}
        />
      )}
      
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
  render(<ChatApp {...options} />, { exitOnCtrlC: false })
}
