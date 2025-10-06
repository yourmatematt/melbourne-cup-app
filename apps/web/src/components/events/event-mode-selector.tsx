'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface EventModeSelectorProps {
  value: 'sweep' | 'calcutta'
  onChange: (value: 'sweep' | 'calcutta') => void
}

export function EventModeSelector({ value, onChange }: EventModeSelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="sweep" id="sweep" />
        <Label htmlFor="sweep" className="flex-1 cursor-pointer">
          <Card className={`transition-colors ${value === 'sweep' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Sweep</CardTitle>
                <Badge variant="secondary">Most Popular</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription>
                Traditional random draw where participants pay a fixed amount and are randomly assigned horses.
                Winners are determined by horse finishing positions.
              </CardDescription>
            </CardContent>
          </Card>
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <RadioGroupItem value="calcutta" id="calcutta" />
        <Label htmlFor="calcutta" className="flex-1 cursor-pointer">
          <Card className={`transition-colors ${value === 'calcutta' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Calcutta</CardTitle>
                <Badge variant="outline">Auction</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription>
                Auction-style event where horses are bid on by participants.
                Higher-valued horses typically reflect better odds of winning.
              </CardDescription>
            </CardContent>
          </Card>
        </Label>
      </div>
    </RadioGroup>
  )
}