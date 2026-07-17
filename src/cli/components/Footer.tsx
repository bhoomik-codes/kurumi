import React from 'react'
import { Box, Text } from 'ink'

interface FooterProps {
  cwd: string
  provider: string
  model: string
  contextUsage: number
}

export function Footer({ cwd, provider, model, contextUsage }: FooterProps) {
  return (
    <Box marginTop={1} paddingTop={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} borderColor="gray">
      <Text color="gray">{cwd}</Text>
      <Text color="gray">  |  Daemon: </Text><Text color="green">OK</Text>
      <Text color="gray">  |  </Text><Text color="cyan">{provider}/{model}</Text>
      <Text color="gray">  |  ctx: </Text><Text color={contextUsage > 80 ? "red" : "yellow"}>{contextUsage}%</Text>
    </Box>
  )
}
