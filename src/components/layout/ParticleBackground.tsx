import React, { useEffect, useRef } from 'react'

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight
    let animationFrameId: number

    // Particles
    const particles: { x: number, y: number, radius: number, speedX: number, speedY: number, alpha: number }[] = []
    
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3 - 0.2, // Drift upwards slightly
        alpha: Math.random() * 0.5 + 0.1
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      
      // Draw background gradient
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/1.5)
      gradient.addColorStop(0, 'rgba(10, 5, 8, 0.2)')
      gradient.addColorStop(1, 'rgba(5, 3, 5, 0.8)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Draw particles
      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(196, 30, 58, ${p.alpha})` // Red Bright
        ctx.fill()

        // Move
        p.x += p.speedX
        p.y += p.speedY

        // Wrap
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-0"
    />
  )
}
