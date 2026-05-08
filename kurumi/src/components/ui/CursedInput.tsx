import React, { forwardRef } from 'react'

interface CursedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const CursedInput = forwardRef<HTMLInputElement, CursedInputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-sm font-display-dec text-text-secondary">{label}</label>}
        <div className="relative">
          <input
            ref={ref}
            className={`w-full bg-abyss/80 border border-border-glass rounded-lg px-4 py-2 text-text-primary 
              focus:outline-none focus:border-red-glow focus:shadow-[0_0_15px_rgba(255,34,68,0.3)] 
              transition-all duration-300 placeholder:text-text-dim ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-glow mt-1">{error}</span>}
      </div>
    )
  }
)

CursedInput.displayName = 'CursedInput'
export default CursedInput
