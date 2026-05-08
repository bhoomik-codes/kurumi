import React from 'react'
import { Loader2 } from 'lucide-react'

interface CursedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
  isLoading?: boolean
}

export default function CursedButton({
  children,
  className = '',
  variant = 'primary',
  isLoading = false,
  disabled,
  ...props
}: CursedButtonProps) {
  const baseClasses = 'relative inline-flex items-center justify-center font-display tracking-wide transition-all duration-200 overflow-hidden'
  const disabledClasses = disabled || isLoading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'

  let variantClasses = ''
  switch (variant) {
    case 'primary':
      variantClasses = 'bg-red-glow text-white px-6 py-2 rounded-lg hover:glowing border border-red-bright'
      break
    case 'secondary':
      variantClasses = 'glass-default text-red-bright px-6 py-2 rounded-lg border border-red-core hover:border-red-glow'
      break
    case 'ghost':
      variantClasses = 'bg-transparent text-text-secondary px-4 py-2 hover:text-red-bright hover:underline decoration-red-core underline-offset-4'
      break
    case 'danger':
      variantClasses = 'bg-red-core text-white px-6 py-2 rounded-lg hover:bg-red-vein'
      break
    case 'icon':
      variantClasses = 'p-2 rounded-md text-text-secondary hover:text-red-bright hover:bg-red-muted/20'
      break
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${disabledClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
      
      {/* Ripple effect pseudo-element (handled via CSS or simplified here via absolute div) */}
      {!disabled && !isLoading && (
        <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity rounded-inherit pointer-events-none" />
      )}
    </button>
  )
}
