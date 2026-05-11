import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useModelStore } from '../../stores/modelStore'
import { Activity, Cpu, Database } from 'lucide-react'

export default function StatusBar() {
  const { systemStats, updateSystemStats } = useSettingsStore()
  const { activeModel, isModelWarming } = useModelStore()
  const [ollamaStatus, setOllamaStatus] = useState<'connected' | 'disconnected'>('disconnected')

  useEffect(() => {
    // Ping ollama status on mount
    const checkOllama = async () => {
      try {
        const status = await window.electron?.invoke('ollama:status')
        if (status) {
          setOllamaStatus('connected')
        } else {
          setOllamaStatus('disconnected')
        }
      } catch (e) {
        setOllamaStatus('disconnected')
      }
    }
    checkOllama()
    
    const interval = setInterval(checkOllama, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Poll system stats for status bar (VRAM/RAM)
    const poll = async () => {
      try {
        const stats = await window.electron?.invoke('system:stats')
        if (stats) updateSystemStats(stats)
      } catch {
        // ignore; keep last known values
      }
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [updateSystemStats])

  return (
    <footer className="h-8 flex items-center justify-between px-4 glass-surface border-t border-border-glass text-xs text-text-dim z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${ollamaStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="uppercase font-display-dec tracking-wider">
            {ollamaStatus === 'connected' ? 'Ollama Online' : 'Ollama Offline'}
          </span>
        </div>
        
        {activeModel && (
          <div className="flex items-center gap-1 border-l border-border-glass pl-4">
            <Database size={12} className="text-red-core" />
            <span className="text-text-secondary">{activeModel}</span>
            {isModelWarming && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-text-dim">
                Setting up…
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1" title={systemStats.gpuName}>
          <Cpu size={12} className="text-text-secondary" />
          <span>VRAM: {systemStats.vramUsed} / {systemStats.vramTotal} GB</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity size={12} className="text-red-glow" />
          <span>{systemStats.tokensPerSecond} t/s</span>
        </div>
      </div>
    </footer>
  )
}
