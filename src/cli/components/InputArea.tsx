import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

interface InputAreaProps {
  onSubmit: (text: string) => void
  onInterrupt: () => void
  isGenerating: boolean
}

export function InputArea({ onSubmit, onInterrupt, isGenerating }: InputAreaProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [cursor, setCursor] = useState(0)

  useInput((char, key) => {
    if (isGenerating) {
      if (key.escape) onInterrupt()
      return
    }

    if (key.ctrl && char === 'n') {
      setInput(prev => prev.slice(0, cursor) + '\n' + prev.slice(cursor))
      setCursor(c => c + 1)
      return
    }

    if (key.return) {
      if (key.shift || key.meta) { // Shift+Enter or Alt+Enter
        setInput(prev => prev.slice(0, cursor) + '\n' + prev.slice(cursor))
        setCursor(c => c + 1)
      } else if (input.endsWith('\\')) {
        // Trailing backslash acts as a line continuation
        setInput(prev => prev.slice(0, -1) + '\n')
        setCursor(c => c)
      } else {
        const trimmed = input.trim()
        if (trimmed) {
          setHistory(prev => [...prev, trimmed])
          onSubmit(trimmed)
        }
        setInput('')
        setCursor(0)
        setHistoryIdx(-1)
      }
      return
    }

    if (key.upArrow) {
      if (history.length > 0 && historyIdx < history.length - 1) {
        const nextIdx = historyIdx + 1
        setHistoryIdx(nextIdx)
        const val = history[history.length - 1 - nextIdx]
        setInput(val)
        setCursor(val.length)
      }
      return
    }

    if (key.downArrow) {
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1
        setHistoryIdx(nextIdx)
        const val = history[history.length - 1 - nextIdx]
        setInput(val)
        setCursor(val.length)
      } else if (historyIdx === 0) {
        setHistoryIdx(-1)
        setInput('')
        setCursor(0)
      }
      return
    }

    if (key.leftArrow) {
      setCursor(c => Math.max(0, c - 1))
      return
    }

    if (key.rightArrow) {
      setCursor(c => Math.min(input.length, c + 1))
      return
    }

    if (key.backspace || key.delete) {
      if (cursor > 0) {
        setInput(prev => prev.slice(0, cursor - 1) + prev.slice(cursor))
        setCursor(c => c - 1)
      }
      return
    }

    if (key.tab) {
      const beforeStr = input.slice(0, cursor)
      const afterStr = input.slice(cursor)
      const words = beforeStr.split(/(\s+)/)
      const currentWord = words[words.length - 1]

      if (currentWord.startsWith('/')) {
        const cmds = ['/help', '/about', '/clear', '/quit', '/exit', '/models', '/execute', '/goal', '/plan']
        const match = cmds.find(c => c.startsWith(currentWord))
        if (match) {
          const replacement = match + ' '
          setInput(beforeStr.slice(0, -currentWord.length) + replacement + afterStr)
          setCursor(beforeStr.length - currentWord.length + replacement.length)
        }
      } else if (currentWord.startsWith('@')) {
        const fs = require('fs')
        const path = require('path')
        let searchPath = currentWord.slice(1)
        let dir = '.'
        let prefix = searchPath
        
        if (searchPath.includes('/')) {
          const lastSlash = searchPath.lastIndexOf('/')
          dir = searchPath.slice(0, lastSlash) || '/'
          prefix = searchPath.slice(lastSlash + 1)
        }
        
        try {
          const files = fs.readdirSync(dir)
          // Basic ignore logic: .git, node_modules, hidden files (optional), and common binaries
          const ignores = new Set(['.git', 'node_modules', '.DS_Store'])
          const binExts = ['.exe', '.dll', '.so', '.dylib', '.png', '.jpg', '.jpeg', '.gif', '.mp4', '.zip', '.tar', '.gz']
          
          let matches = files.filter((f: string) => 
            f.startsWith(prefix) && 
            !ignores.has(f) && 
            !binExts.some(ext => f.toLowerCase().endsWith(ext))
          )
          
          // Also try to read .gitignore in the directory
          try {
            const gitignore = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')
            const ignorePatterns = gitignore.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !l.startsWith('#'))
            matches = matches.filter((f: string) => !ignorePatterns.some((pattern: string) => {
              // Extremely basic glob match for gitignore
              const regexStr = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')
              return new RegExp(`^${regexStr}$`).test(f)
            }))
          } catch {
            // No .gitignore, ignore
          }

          if (matches.length === 1) {
            const match = matches[0]
            const stat = fs.statSync(path.join(dir, match))
            const isDir = stat.isDirectory()
            const replacement = currentWord.slice(0, currentWord.lastIndexOf('/') + 1) + match + (isDir ? '/' : ' ')
            setInput(beforeStr.slice(0, -currentWord.length) + replacement + afterStr)
            setCursor(beforeStr.length - currentWord.length + replacement.length)
          } else if (matches.length > 1) {
            // Find longest common prefix
            let i = 0
            const first = matches[0]
            while (i < first.length) {
              const char = first[i]
              if (matches.every((m: string) => m[i] === char)) i++
              else break
            }
            if (i > prefix.length) {
              const match = first.slice(0, i)
              const replacement = currentWord.slice(0, currentWord.lastIndexOf('/') + 1) + match
              setInput(beforeStr.slice(0, -currentWord.length) + replacement + afterStr)
              setCursor(beforeStr.length - currentWord.length + replacement.length)
            }
          }
        } catch (e) {
          // Ignore fs errors (e.g. dir not found)
        }
      }
      return
    }

    if (char) {
      setInput(prev => prev.slice(0, cursor) + char + prev.slice(cursor))
      setCursor(c => c + char.length)
    }
  })

  const beforeCursor = input.slice(0, cursor)
  const afterCursor = input.slice(cursor)

  return (
    <Box flexDirection="row">
      <Box marginRight={1}>
        <Text color="redBright">❯</Text>
      </Box>
      {isGenerating ? (
        <Text color="gray">Generating... (Press Esc to cancel)</Text>
      ) : (
        <Text>
          {beforeCursor}
          <Text inverse>{afterCursor.length > 0 ? afterCursor[0] : ' '}</Text>
          {afterCursor.slice(1)}
        </Text>
      )}
    </Box>
  )
}
