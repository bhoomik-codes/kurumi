import React from 'react'
import { Box, Text } from 'ink'

export function Splash() {
  return (
    <Box flexDirection="column" paddingBottom={1}>
      <Text color="redBright" bold>
{`
╔═════════════════════════════════════════════════════════════╗
║  ██╗  ██╗██╗   ██╗██████╗ ██╗   ██╗███╗   ███╗██╗          ║
║  ██║ ██╔╝██║   ██║██╔══██╗██║   ██║████╗ ████║██║          ║
║  █████╔╝ ██║   ██║██████╔╝██║   ██║██╔████╔██║██║          ║
║  ██╔═██╗ ██║   ██║██╔══██╗██║   ██║██║╚██╔╝██║██║          ║
║  ██║  ██╗╚██████╔╝██║  ██║╚██████╔╝██║ ╚═╝ ██║██║          ║
║  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝          ║
║                                                             ║
║             「 Unlimited Void. Unlimited AI. 」            ║
╚═════════════════════════════════════════════════════════════╝`}
      </Text>
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Text color="gray">Tips for getting started:</Text>
        <Text color="gray">1. Ask questions, generate code, or run commands.</Text>
        <Text color="gray">2. Be specific for the best results.</Text>
        <Text color="gray">3. /help for more information.</Text>
      </Box>
    </Box>
  )
}
