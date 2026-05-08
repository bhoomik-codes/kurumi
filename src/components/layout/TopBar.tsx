import React from 'react'
import { Minus, Square, X } from 'lucide-react'

export default function TopBar() {
  const handleMinimize = () => window.electron?.invoke('window:minimize')
  const handleMaximize = () => window.electron?.invoke('window:maximize')
  const handleClose = () => window.electron?.invoke('window:close')

  return (
    <header className="h-10 flex items-center justify-between px-4 glass-deep drag-region z-50">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-core glowing" />
        <span className="font-display font-bold text-sm tracking-widest text-text-primary uppercase">Kurumi</span>
      </div>

      <div className="flex items-center h-full no-drag-region">
        <button 
          onClick={handleMinimize}
          className="h-full px-3 text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
        >
          <Minus size={16} />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full px-3 text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
        >
          <Square size={14} />
        </button>
        <button 
          onClick={handleClose}
          className="h-full px-3 text-text-secondary hover:text-white hover:bg-red-core transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  )
}
