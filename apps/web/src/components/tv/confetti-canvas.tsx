'use client'

import { useEffect, useRef } from 'react'

interface ConfettiCanvasProps {
  show: boolean
}

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  color: string
  size: number
  shape: 'rect' | 'circle'
  life: number
  maxLife: number
}

const COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE'  // Light Purple
]

export function ConfettiCanvas({ show }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const particlesRef = useRef<ConfettiParticle[]>([])
  const lastTimeRef = useRef<number>(0)

  const createParticle = (x: number, y: number): ConfettiParticle => {
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * -15 - 5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      life: 0,
      maxLife: 3000 + Math.random() * 2000
    }
  }

  const createConfettiBurst = (x: number, y: number, count: number = 50) => {
    const newParticles: ConfettiParticle[] = []
    for (let i = 0; i < count; i++) {
      newParticles.push(createParticle(x, y))
    }
    particlesRef.current.push(...newParticles)
  }

  const updateParticles = (deltaTime: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    particlesRef.current = particlesRef.current.filter(particle => {
      // Update life
      particle.life += deltaTime

      // Remove if expired
      if (particle.life >= particle.maxLife) {
        return false
      }

      // Update physics
      particle.x += particle.vx * (deltaTime / 16)
      particle.y += particle.vy * (deltaTime / 16)
      particle.vy += 0.5 * (deltaTime / 16) // Gravity
      particle.rotation += particle.rotationSpeed * (deltaTime / 16)

      // Apply air resistance
      particle.vx *= 0.99
      particle.vy *= 0.99

      // Remove if off screen
      if (particle.y > canvas.height + 50 ||
          particle.x < -50 ||
          particle.x > canvas.width + 50) {
        return false
      }

      return true
    })
  }

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(particle => {
      ctx.save()

      // Calculate opacity based on life
      const lifeRatio = particle.life / particle.maxLife
      const opacity = Math.max(0, 1 - lifeRatio)

      ctx.globalAlpha = opacity
      ctx.fillStyle = particle.color

      // Move to particle position
      ctx.translate(particle.x, particle.y)
      ctx.rotate((particle.rotation * Math.PI) / 180)

      // Draw shape
      if (particle.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size)
      }

      ctx.restore()
    })
  }

  const animate = (currentTime: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const deltaTime = currentTime - lastTimeRef.current
    lastTimeRef.current = currentTime

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Update and draw particles
    updateParticles(deltaTime)
    drawParticles(ctx)

    // Continue animation if there are particles
    if (particlesRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }

  const startConfetti = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create multiple bursts across the screen
    const burstCount = 8
    for (let i = 0; i < burstCount; i++) {
      const x = (canvas.width / burstCount) * i + (canvas.width / burstCount) / 2
      const y = canvas.height * 0.1

      setTimeout(() => {
        createConfettiBurst(x, y, 30)
      }, i * 100)
    }

    // Create center burst
    setTimeout(() => {
      createConfettiBurst(canvas.width / 2, canvas.height * 0.2, 100)
    }, 200)

    // Start animation
    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animate)
  }

  const stopConfetti = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    particlesRef.current = []

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  useEffect(() => {
    resizeCanvas()

    const handleResize = () => resizeCanvas()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (show) {
      startConfetti()
    } else {
      stopConfetti()
    }
  }, [show])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}