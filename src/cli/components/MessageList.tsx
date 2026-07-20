import React, { useMemo } from 'react'
import { Box, Text } from 'ink'
import { marked } from 'marked'
import TerminalRenderer from 'marked-terminal'

marked.setOptions({
  renderer: new TerminalRenderer({
    reflowText: true,
    width: process.stdout.columns ? Math.max(80, process.stdout.columns - 4) : 80
  }) as any
})

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'system-process'
  content: string
}

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  // Render user as plain text, assistant as markdown
  return (
    <Box flexDirection="column" marginBottom={1}>
      {messages.filter(m => m.role !== 'system').map((m, i) => {
        const isUser = m.role === 'user'
        const isProcess = m.role === 'system-process'
        const renderedContent = isUser || isProcess ? m.content : marked.parse(m.content)
        
        return (
          <Box key={i} flexDirection="column" marginBottom={1} 
               borderStyle={isProcess ? "round" : undefined}
               borderColor={isProcess ? "gray" : undefined}
               paddingX={isProcess ? 1 : 0}>
            <Text bold color={isUser ? 'blue' : (isProcess ? 'gray' : 'redBright')}>
              {isUser ? 'You' : (isProcess ? 'System Process' : 'Kurumi')}
            </Text>
            {isUser || isProcess ? (
              <Text color={isProcess ? "gray" : undefined}>{renderedContent as string}</Text>
            ) : (
              // marked-terminal outputs strings with ANSI codes, Text handles it fine
              <Text>{(renderedContent as string).trim()}</Text>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
