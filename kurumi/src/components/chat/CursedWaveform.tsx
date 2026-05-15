/**
 * Phase 9 — Cursed Speech: Waveform Visualizer.
 *
 * A jagged, crimson-red waveform that mirrors the user's voice intensity.
 * Driven by the Float32Array in voiceStore (updated every rAF while recording).
 * Uses a plain HTML5 Canvas — no extra dependencies.
 */

import React, { useRef, useEffect } from 'react'
import { useVoiceStore } from '../../stores/voiceStore'

interface CursedWaveformProps {
  /** Width of the canvas in CSS pixels */
  width?: number
  /** Height of the canvas in CSS pixels */
  height?: number
  /** Show only when this is true (saves rAF when idle) */
  active: boolean
}

export default function CursedWaveform({ width = 220, height = 36, active }: CursedWaveformProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const waveformData = useVoiceStore((s) => s.waveformData)
  const status      = useVoiceStore((s) => s.status)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width  = width  * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    if (!active) return

    const data   = waveformData
    const len    = data.length
    const sliceW = width / len
    const midY   = height / 2

    // Draw glow trail first
    ctx.save()
    ctx.filter = 'blur(3px)'
    drawLine(ctx, data, sliceW, midY, height, 'rgba(255,34,68,0.35)', 2.5)
    ctx.restore()

    // Draw sharp foreground line
    drawLine(ctx, data, sliceW, midY, height, buildGradient(ctx, width, height), 1.5)

    // Processing indicator — pulsing dot at right edge
    if (status === 'processing') {
      const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 200)
      ctx.beginPath()
      ctx.arc(width - 6, midY, 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,34,68,${alpha})`
      ctx.fill()
    }
  }, [waveformData, active, status, width, height])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="pointer-events-none"
      aria-hidden
    />
  )
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  sliceW: number,
  midY: number,
  height: number,
  strokeStyle: string | CanvasGradient,
  lineWidth: number
) {
  ctx.beginPath()
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = strokeStyle
  ctx.lineJoin = 'round'

  let x = 0
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]))
    const y = midY + sample * (height / 2) * 0.85
    if (i === 0) ctx.moveTo(x, y)
    else         ctx.lineTo(x, y)
    x += sliceW
  }
  ctx.stroke()
}

function buildGradient(ctx: CanvasRenderingContext2D, width: number, height: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, width, 0)
  g.addColorStop(0.0,  'rgba(139,0,0,0.8)')
  g.addColorStop(0.4,  'rgba(196,30,58,1)')
  g.addColorStop(0.7,  'rgba(255,34,68,1)')
  g.addColorStop(1.0,  'rgba(255,100,120,0.9)')
  return g
}
