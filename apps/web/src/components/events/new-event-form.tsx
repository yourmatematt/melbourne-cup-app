'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { newEventSchema, type NewEventFormData, type HorseFormData } from '@/lib/event-schemas'
import { MELBOURNE_CUP_2025_DATE, MELBOURNE_CUP_2025_HORSES, type HorseData } from '@/lib/melbourne-cup-data'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { DateTimePicker } from './date-time-picker'
import { CapacitySelector } from './capacity-selector'
import { HorseListEditor } from './horse-list-editor'
import { EventModeSelector } from './event-mode-selector'

export function NewEventForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [horses, setHorses] = useState<HorseFormData[]>(
    MELBOURNE_CUP_2025_HORSES.map(horse => ({
      ...horse,
      jockey: horse.jockey || '',
      isScratched: false
    }))
  )
  const [user, setUser] = useState<any>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Get user and tenant info
  useEffect(() => {
    async function getUserAndTenant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get tenant ID
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantUser) {
        setTenantId(tenantUser.tenant_id)
      }
    }

    getUserAndTenant()
  }, [router, supabase])

  const form = useForm<NewEventFormData>({
    resolver: zodResolver(newEventSchema),
    defaultValues: {
      name: 'Melbourne Cup 2025',
      startsAt: MELBOURNE_CUP_2025_DATE,
      timezone: 'Australia/Melbourne',
      capacity: 24,
      mode: 'sweep',
      leadCapture: false,
      customTerms: '',
      customRules: '',
      promoEnabled: false,
      promoMessage: '',
      promoDuration: 10
    }
  })

  async function onSubmit(data: NewEventFormData) {
    if (!user || !tenantId) {
      setError('Please log in to create an event')
      return
    }

    if (horses.length === 0) {
      setError('Please add at least one horse to the field')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          starts_at: data.startsAt,
          timezone: data.timezone,
          capacity: data.capacity,
          mode: data.mode,
          lead_capture: data.leadCapture,
          promo_enabled: data.promoEnabled,
          promo_message: data.promoEnabled ? data.promoMessage : null,
          promo_duration: data.promoEnabled ? data.promoDuration : null,
          status: 'draft'
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Create horses
      const horsesToInsert = horses.map(horse => ({
        event_id: event.id,
        number: horse.number,
        name: horse.name,
        jockey: horse.jockey || null,
        is_scratched: horse.isScratched
      }))

      const { error: horsesError } = await supabase
        .from('event_horses')
        .insert(horsesToInsert)

      if (horsesError) throw horsesError

      // Redirect to event details
      router.push('/dashboard')
    } catch (err) {
      console.error('Error creating event:', err)
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || !tenantId) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Event Details</TabsTrigger>
            <TabsTrigger value="horses">Horse Field</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Melbourne Cup 2025" {...field} />
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
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      When does the race start?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Mode</FormLabel>
                    <FormControl>
                      <EventModeSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose between sweep or calcutta
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
                      <CapacitySelector
                        value={field.value}
                        onChange={field.onChange}
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

            <FormField
              control={form.control}
              name="leadCapture"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Lead Capture</FormLabel>
                    <FormDescription>
                      Collect participant contact details for marketing
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Promotional Incentives</h3>
              <p className="text-sm text-gray-600">
                Encourage immediate payment with time-limited promotional offers
              </p>

              <FormField
                control={form.control}
                name="promoEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Promotional Offers</FormLabel>
                      <FormDescription>
                        Offer incentives for quick payment to boost conversion
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('promoEnabled') && (
                <div className="space-y-4 pl-4 border-l-2 border-green-200 bg-green-50 p-4 rounded-r-lg">
                  <FormField
                    control={form.control}
                    name="promoMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promotional Offer Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Pay within 10 minutes and receive a free pot of Carlton Draught"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          What participants will receive for paying quickly. Be specific and appealing!
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="promoDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer Valid For (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            placeholder="10"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                          />
                        </FormControl>
                        <FormDescription>
                          How long the promotional offer remains valid after registration
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-medium text-blue-900 mb-2">💡 Promotional Offer Tips</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Be specific: "Free pot of Carlton Draught" vs "Free drink"</li>
                      <li>• Create urgency: Shorter time limits drive faster action</li>
                      <li>• Consider your margins: Factor promo costs into event planning</li>
                      <li>• Example: "Pay within 5 minutes: Free garlic bread + drink"</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Terms & Rules</h3>

              <FormField
                control={form.control}
                name="customTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Terms & Conditions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any custom terms and conditions for your event..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional terms specific to your venue or event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customRules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Rules (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any custom rules for the sweep..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Special rules or instructions for participants
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="horses" className="mt-6">
            <HorseListEditor
              horses={horses}
              onChange={setHorses}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="gradient" disabled={isLoading}>
            {isLoading ? 'Creating Event...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Form>
  )
}