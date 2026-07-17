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

    if (key.return) {
      if (key.shift) {
        setInput(prev => prev.slice(0, cursor) + '\n' + prev.slice(cursor))
        setCursor(c => c + 1)
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
      // Basic autocomplete for slash commands
      const cmds = ['/help', '/about', '/clear', '/quit', '/exit', '/models']
      const match = cmds.find(c => c.startsWith(input))
      if (match) {
        setInput(match + ' ')
        setCursor(match.length + 1)
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
