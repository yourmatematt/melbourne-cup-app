'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const formatDateTimeLocal = (isoString: string) => {
    if (!isoString) return ''

    try {
      const date = new Date(isoString)
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')

      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateTimeLocal = e.target.value
    if (!dateTimeLocal) {
      onChange('')
      return
    }

    try {
      // Convert datetime-local to ISO string with timezone
      const date = new Date(dateTimeLocal)
      const isoString = date.toISOString()
      onChange(isoString)
    } catch {
      // Invalid date, ignore
    }
  }

  const setMelbourneCupDefault = () => {
    // Melbourne Cup 2025: First Tuesday in November, 3:00 PM AEDT
    const melbourneCup2025 = new Date('2025-11-04T15:00:00+11:00')
    onChange(melbourneCup2025.toISOString())
  }

  const formattedValue = formatDateTimeLocal(value)

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <Input
          type="datetime-local"
          value={formattedValue}
          onChange={handleDateTimeChange}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={setMelbourneCupDefault}
          title="Set to Melbourne Cup 2025 date"
        >
          <Calendar className="h-4 w-4" />
        </Button>
      </div>

      {value && (
        <div className="text-xs text-gray-500">
          {new Date(value).toLocaleString('en-AU', {
            timeZone: 'Australia/Melbourne',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </div>
      )}
    </div>
  )
}