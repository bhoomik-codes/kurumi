import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'

interface ModelSwitcherProps {
  daemonUrl: string
  onSelect: (provider: string, model: string) => void
  onCancel: () => void
}

interface Option {
  label: string
  value: string
  provider: string
  model: string
}

export function ModelSwitcher({ daemonUrl, onSelect, onCancel }: ModelSwitcherProps) {
  const [items, setItems] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${daemonUrl}/models`)
      .then(res => res.json())
      .then(data => {
        const options: Option[] = []
        if (data.ollama) {
          data.ollama.forEach((m: any) => {
            options.push({ label: `[Ollama] ${m.name}`, value: `ollama:${m.name}`, provider: 'ollama', model: m.name })
          })
        }
        if (data.airllm) {
          data.airllm.forEach((m: any) => {
            options.push({ label: `[AirLLM] ${m}`, value: `airllm:${m}`, provider: 'airllm', model: m })
          })
        }
        if (data.nvidia) {
          data.nvidia.forEach((m: any) => {
            options.push({ label: `[NVIDIA] ${m.id}`, value: `nvidia:${m.id}`, provider: 'nvidia', model: m.id })
          })
        }
        setItems(options)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [daemonUrl])

  if (loading) return <Text color="gray">Loading models...</Text>
  if (error) return <Text color="red">Error loading models: {error}</Text>
  if (items.length === 0) return <Text color="yellow">No models found.</Text>

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan">
      <Box marginBottom={1}>
        <Text bold color="cyan">Select a Model (Esc to cancel)</Text>
      </Box>
      <SelectInput 
        items={items} 
        onSelect={item => {
          const opt = item as unknown as Option
          onSelect(opt.provider, opt.model)
        }} 
      />
    </Box>
  )
}
