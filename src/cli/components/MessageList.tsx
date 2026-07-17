import React, { useMemo } from 'react'
import { Box, Text } from 'ink'
import { marked } from 'marked'
import TerminalRenderer from 'marked-terminal'

marked.setOptions({
  renderer: new TerminalRenderer({
    code: require('chalk').red,
    reflowText: true,
    width: 80
  })
})

export interface Message {
  role: 'user' | 'assistant' | 'system'
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
        const renderedContent = isUser ? m.content : marked.parse(m.content)
        
        return (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text bold color={isUser ? 'blue' : 'redBright'}>
              {isUser ? 'You' : 'Kurumi'}
            </Text>
            {isUser ? (
              <Text>{renderedContent as string}</Text>
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
