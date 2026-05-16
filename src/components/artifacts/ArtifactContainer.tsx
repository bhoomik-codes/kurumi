import React from 'react'
import { CodeArtifact } from './CodeArtifact'
import { ReactArtifact } from './ReactArtifact'
import { HtmlArtifact } from './HtmlArtifact'
import { MermaidArtifact } from './MermaidArtifact'
import { ChartArtifact } from './ChartArtifact'

interface ArtifactContainerProps {
  language: string
  code: string
}

function isChartSpec(code: string): boolean {
  try {
    const parsed = JSON.parse(code)
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.type === 'string' &&
      Array.isArray(parsed.data)
    )
  } catch {
    return false
  }
}

export function ArtifactContainer({ language, code }: ArtifactContainerProps) {
  const lang = (language || '').toLowerCase().trim()

  // React / JSX / TSX  →  live sandboxed React component
  if (lang === 'react' || lang === 'jsx' || lang === 'tsx') {
    return <ReactArtifact code={code} language={lang} />
  }

  // HTML / SVG  →  sandboxed srcdoc iframe
  if (lang === 'html' || lang === 'svg') {
    return <HtmlArtifact code={code} language={lang} />
  }

  // Mermaid  →  native mermaid renderer
  if (lang === 'mermaid') {
    return <MermaidArtifact code={code} language={lang} />
  }

  // chart  →  Recharts renderer (explicit language tag)
  if (lang === 'chart') {
    return <ChartArtifact code={code} language={lang} />
  }

  // json  →  try to interpret as chart spec; fall back to code block
  if (lang === 'json' && isChartSpec(code)) {
    return <ChartArtifact code={code} language={lang} />
  }

  // Everything else  →  syntax-highlighted code block
  return <CodeArtifact code={code} language={lang} />
}
