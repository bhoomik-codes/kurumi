/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    // Dynamic glass variants
    'glass-default', 'glass-deep', 'glass-surface', 'glass-modal',
    // Dynamic button variants
    'btn-primary', 'btn-secondary', 'btn-ghost', 'btn-danger', 'btn-icon',
    // Dynamic badge variants
    'badge-vision', 'badge-code', 'badge-fast', 'badge-multilingual',
    // Glow states
    'glow-active', 'glow-pulse',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'void':        '#050305',
        'abyss':       '#0A0508',
        'bg-dark':     '#110810',
        'red-core':    '#8B0000',
        'red-bright':  '#C41E3A',
        'red-glow':    '#FF2244',
        'red-muted':   '#5C1A2A',
        'red-vein':    '#991B1B',
        'purple-deep': '#1A0A2E',
        'purple-mid':  '#4B0082',
        'purple-glow': '#7B2FBE',
        'text-primary':   '#F5E6E8',
        'text-secondary': '#B09098',
        'text-dim':       '#6B4A52',
        'text-accent':    '#FF6B7A',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        'display-dec': ['Cinzel Decorative', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Nunito', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px',
      },
      animation: {
        'cursed-shimmer': 'cursedShimmer 4s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
        'page-reveal': 'pageReveal 0.35s ease-out forwards',
        'blood-fill': 'bloodFill 0.3s ease-out forwards',
        'vein-crawl': 'veinCrawl 2s ease-in-out forwards',
      },
    },
  },
  plugins: [],
}
