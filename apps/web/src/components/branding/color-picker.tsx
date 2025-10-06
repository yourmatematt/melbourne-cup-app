'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Palette, Check, RotateCcw } from 'lucide-react'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
  className?: string
  presets?: string[]
}

interface HSL {
  h: number
  s: number
  l: number
}

export function ColorPicker({
  color,
  onChange,
  label = "Color",
  className = "",
  presets = [
    '#FFB800', '#FF6B35', '#F7931E', '#C5282F', '#8E44AD',
    '#3498DB', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6',
    '#1ABC9C', '#34495E', '#95A5A6', '#D35400', '#27AE60'
  ]
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputColor, setInputColor] = useState(color)
  const [hsl, setHsl] = useState<HSL>({ h: 0, s: 50, l: 50 })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Convert hex to HSL
  const hexToHsl = (hex: string): HSL => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    const hNorm = h / 360
    const sNorm = s / 100
    const lNorm = l / 100

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    let r, g, b

    if (sNorm === 0) {
      r = g = b = lNorm
    } else {
      const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
      const p = 2 * lNorm - q
      r = hue2rgb(p, q, hNorm + 1/3)
      g = hue2rgb(p, q, hNorm)
      b = hue2rgb(p, q, hNorm - 1/3)
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  // Initialize HSL from color prop
  useEffect(() => {
    if (color && color.startsWith('#') && color.length === 7) {
      setHsl(hexToHsl(color))
      setInputColor(color)
    }
  }, [color])

  // Draw color picker canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Create gradient for saturation/lightness
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const s = (x / width) * 100
        const l = 100 - (y / height) * 100
        const hexColor = hslToHex(hsl.h, s, l)

        ctx.fillStyle = hexColor
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }, [hsl.h])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const s = (x / canvas.width) * 100
    const l = 100 - (y / canvas.height) * 100

    const newHsl = { ...hsl, s: Math.round(s), l: Math.round(l) }
    setHsl(newHsl)

    const newColor = hslToHex(newHsl.h, newHsl.s, newHsl.l)
    setInputColor(newColor)
    onChange(newColor)
  }

  const handleHueChange = (newHue: number) => {
    const newHsl = { ...hsl, h: newHue }
    setHsl(newHsl)

    const newColor = hslToHex(newHsl.h, newHsl.s, newHsl.l)
    setInputColor(newColor)
    onChange(newColor)
  }

  const handleInputChange = (value: string) => {
    setInputColor(value)

    if (value.match(/^#[0-9A-Fa-f]{6}$/)) {
      setHsl(hexToHsl(value))
      onChange(value)
    }
  }

  const handlePresetClick = (preset: string) => {
    setInputColor(preset)
    setHsl(hexToHsl(preset))
    onChange(preset)
  }

  const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex)

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label className="text-sm font-medium">{label}</Label>}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-12 p-2 justify-start"
          >
            <div className="flex items-center space-x-3 w-full">
              <motion.div
                className="w-8 h-8 rounded-lg border-2 border-white shadow-md"
                style={{ backgroundColor: color }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{color.toUpperCase()}</div>
                <div className="text-xs text-gray-500">
                  HSL({hsl.h}°, {hsl.s}%, {hsl.l}%)
                </div>
              </div>
              <Palette className="w-4 h-4 text-gray-400" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Color Canvas */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Saturation & Lightness</Label>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={140}
                  className="w-full h-35 rounded-lg border cursor-crosshair"
                  onClick={handleCanvasClick}
                />

                {/* Current color indicator */}
                <motion.div
                  className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg pointer-events-none"
                  style={{
                    left: `${(hsl.s / 100) * 280 - 6}px`,
                    top: `${(1 - hsl.l / 100) * 140 - 6}px`,
                    backgroundColor: color
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>

            {/* Hue Slider */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Hue</Label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hsl.h}
                  onChange={(e) => handleHueChange(parseInt(e.target.value))}
                  className="w-full h-4 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                  }}
                />
                <div
                  className="absolute top-1 w-2 h-2 bg-white border-2 border-gray-800 rounded-full pointer-events-none"
                  style={{ left: `${(hsl.h / 360) * 280 - 4}px` }}
                />
              </div>
            </div>

            {/* Hex Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Hex Color</Label>
              <div className="flex space-x-2">
                <Input
                  value={inputColor}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="#000000"
                  className={`font-mono ${!isValidHex(inputColor) ? 'border-red-300' : ''}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleInputChange(color)}
                  className="px-3"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Color Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Preset Colors</Label>
              <div className="grid grid-cols-5 gap-2">
                {presets.map((preset, index) => (
                  <motion.button
                    key={preset}
                    className="w-12 h-12 rounded-lg border-2 border-gray-200 relative overflow-hidden"
                    style={{ backgroundColor: preset }}
                    onClick={() => handlePresetClick(preset)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AnimatePresence>
                      {color === preset && (
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center bg-black/20"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Current Color Display */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{color.toUpperCase()}</div>
                    <div className="text-xs text-gray-500">
                      HSL({hsl.h}°, {hsl.s}%, {hsl.l}%)
                    </div>
                    <div className="text-xs text-gray-500">
                      RGB({Math.round(parseInt(color.slice(1, 3), 16))}, {Math.round(parseInt(color.slice(3, 5), 16))}, {Math.round(parseInt(color.slice(5, 7), 16))})
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}