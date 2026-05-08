import React from 'react'

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'deep' | 'surface' | 'modal'
  glowing?: boolean
  animate?: boolean
}

export default function GlassPanel({
  children,
  className = '',
  variant = 'default',
  glowing = false,
  animate = false,
}: GlassPanelProps) {
  const baseClasses = `glass-${variant} relative overflow-hidden text-text-primary rounded-xl transition-all duration-300`
  const glowClasses = glowing ? 'glowing' : ''
  const animateClasses = animate ? 'animate-page-reveal' : ''

  return (
    <div className={`${baseClasses} ${glowClasses} ${animateClasses} ${className}`}>
      {/* Optional: Add a subtle overlay for the shimmer effect here if needed */}
      {children}
    </div>
  )
}
