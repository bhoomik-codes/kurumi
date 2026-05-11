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

export function ArtifactContainer({ language, code }: ArtifactContainerProps) {
  const normalizedLang = (language || '').toLowerCase()

  switch (normalizedLang) {
    case 'react':
    case 'jsx':
    case 'tsx':
      return <ReactArtifact code={code} language={normalizedLang} />
    case 'html':
    case 'svg':
      return <HtmlArtifact code={code} language={normalizedLang} />
    case 'mermaid':
      return <MermaidArtifact code={code} language={normalizedLang} />
    case 'chart':
    case 'json':
      // We assume json might be a chart if it has "type" and "data", but usually the prompt specifies 'chart'
      if (normalizedLang === 'chart' || (code.includes('"type"') && code.includes('"data"'))) {
        try {
          const parsed = JSON.parse(code)
          if (parsed.type && parsed.data) {
             return <ChartArtifact code={code} language={normalizedLang} />
          }
        } catch {}
      }
      return <CodeArtifact code={code} language={normalizedLang} />
    default:
      return <CodeArtifact code={code} language={normalizedLang} />
  }
}
