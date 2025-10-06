'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus } from 'lucide-react'

interface CapacitySelectorProps {
  value: number
  onChange: (value: number) => void
}

const PRESET_CAPACITIES = [10, 15, 20, 24, 30, 40, 50, 100]

export function CapacitySelector({ value, onChange }: CapacitySelectorProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0
    if (newValue >= 10 && newValue <= 200) {
      onChange(newValue)
    }
  }

  const handleIncrement = () => {
    if (value < 200) {
      onChange(value + 1)
    }
  }

  const handleDecrement = () => {
    if (value > 10) {
      onChange(value - 1)
    }
  }

  const handlePresetClick = (capacity: number) => {
    onChange(capacity)
  }

  return (
    <div className="space-y-3">
      {/* Input with increment/decrement buttons */}
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={value <= 10}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Input
          type="number"
          min="10"
          max="200"
          value={value}
          onChange={handleInputChange}
          className="text-center w-20"
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={value >= 200}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Preset capacity buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESET_CAPACITIES.map((capacity) => (
          <Badge
            key={capacity}
            variant={value === capacity ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => handlePresetClick(capacity)}
          >
            {capacity}
            {capacity === 24 && (
              <span className="ml-1 text-xs opacity-75">(Melbourne Cup)</span>
            )}
          </Badge>
        ))}
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        {value === 24
          ? 'Perfect for Melbourne Cup (24 horses)'
          : value < 24
          ? 'Smaller intimate sweep'
          : 'Large venue event'
        }
      </p>
    </div>
  )
}