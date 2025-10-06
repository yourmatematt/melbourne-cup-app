'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventSetupSchema, type EventSetupData } from '@/lib/auth-schemas'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EventSetupFormProps {
  onSubmit: (data: EventSetupData) => void
  onSkip: () => void
  onBack: () => void
  isLoading?: boolean
  defaultValues?: EventSetupData
}

export function EventSetupForm({ onSubmit, onSkip, onBack, isLoading, defaultValues }: EventSetupFormProps) {
  const form = useForm<EventSetupData>({
    resolver: zodResolver(eventSetupSchema),
    defaultValues: defaultValues || {
      name: 'Melbourne Cup 2024',
      startsAt: '',
      capacity: 24,
      mode: 'sweep'
    }
  })

  // Set default date to Melbourne Cup 2024
  const melbourneCupDate = '2024-11-05T14:00'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Create Your First Event (Optional)</h3>
        <p className="text-sm text-gray-600">
          Set up your first Melbourne Cup sweep now, or skip and create one later.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input placeholder="Melbourne Cup 2024" {...field} />
                </FormControl>
                <FormDescription>
                  Give your event a memorable name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date & Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    defaultValue={melbourneCupDate}
                  />
                </FormControl>
                <FormDescription>
                  When does the race start? (Melbourne Cup is typically first Tuesday in November at 3:00 PM AEDT)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sweep">Sweep</SelectItem>
                      <SelectItem value="calcutta">Calcutta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose between a traditional sweep or calcutta auction
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of participants
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <div className="space-x-2">
              <Button type="button" variant="ghost" onClick={onSkip}>
                Skip for Now
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating Event...' : 'Create Event'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}