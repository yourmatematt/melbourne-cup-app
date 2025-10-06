'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patronJoinSchema, type PatronJoinFormData } from '@/lib/patron-schemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Users, Clock, Trophy, MapPin } from 'lucide-react'
import { useBranding } from '@/contexts/branding-context'
import { useBrandColors, getBrandTailwindClasses } from '@/hooks/use-brand-colors'

interface PatronJoinFormProps {
  event: any
  eventStats: any
  onSubmit: (data: PatronJoinFormData) => void
  isLoading: boolean
}

export function PatronJoinForm({ event, eventStats, onSubmit, isLoading }: PatronJoinFormProps) {
  const { brandKit } = useBranding()
  const brandColors = useBrandColors()
  const brandClasses = getBrandTailwindClasses(brandColors)

  const form = useForm<PatronJoinFormData>({
    resolver: zodResolver(patronJoinSchema),
    defaultValues: {
      displayName: '',
      email: '',
      phone: '',
      marketingConsent: false
    }
  })

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  const capacityPercentage = eventStats ? (eventStats.total_entries / event.capacity) * 100 : 0
  const spotsRemaining = event.capacity - (eventStats?.total_entries || 0)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex flex-col items-center justify-center space-y-4 mb-4">
            {/* Venue Logo */}
            {brandKit?.logo_url ? (
              <img
                src={brandKit.logo_url}
                alt="Venue Logo"
                className="h-16 object-contain"
              />
            ) : (
              <div className="flex items-center space-x-2">
                <Trophy className={`h-8 w-8 ${brandClasses.textPrimary}`} />
                <h1 className="text-2xl font-bold text-gray-900">Melbourne Cup</h1>
              </div>
            )}

            {/* Event Title */}
            <h1 className={`text-2xl font-bold ${brandClasses.textSecondary}`}>
              Melbourne Cup 2024
            </h1>
          </div>

          {event.tenant?.name && (
            <div className="flex items-center justify-center space-x-1 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{event.tenant.name}</span>
            </div>
          )}

          {/* Sponsor Banner */}
          {brandKit?.sponsor_banner_url && (
            <div className="mt-4">
              <img
                src={brandKit.sponsor_banner_url}
                alt="Sponsor"
                className="h-12 mx-auto object-contain opacity-90"
              />
            </div>
          )}
        </div>

        {/* Event Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{event.name}</CardTitle>
            <CardDescription className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatEventDate(event.starts_at)}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Capacity Info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>Participants</span>
                </span>
                <span className="font-medium">
                  {eventStats?.total_entries || 0}/{event.capacity}
                </span>
              </div>

              <div className="relative">
                <Progress value={capacityPercentage} className="h-2" />
                <style jsx>{`
                  :global(.progress-indicator) {
                    background-color: var(--brand-primary);
                  }
                `}</style>
              </div>

              <div className="flex justify-between items-center">
                <Badge
                  variant={spotsRemaining > 5 ? "default" : spotsRemaining > 0 ? "secondary" : "destructive"}
                  style={spotsRemaining > 5 ? { backgroundColor: brandColors.primary, color: 'white' } : {}}
                >
                  {spotsRemaining > 0 ? `${spotsRemaining} spots left` : 'Event full'}
                </Badge>

                <Badge
                  variant="outline"
                  className="capitalize"
                  style={{ borderColor: brandColors.secondary, color: brandColors.secondary }}
                >
                  {event.mode}
                </Badge>
              </div>
            </div>

            {/* Warning if nearly full */}
            {spotsRemaining <= 5 && spotsRemaining > 0 && (
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: `color-mix(in srgb, ${brandColors.accent} 10%, white)`,
                  borderColor: `color-mix(in srgb, ${brandColors.accent} 30%, white)`,
                  color: `color-mix(in srgb, ${brandColors.accent} 80%, black)`
                }}
              >
                <p className="text-sm">
                  ⚡ Only {spotsRemaining} spots remaining! Join now to secure your place.
                </p>
              </div>
            )}

            {/* Full event message */}
            {spotsRemaining <= 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  🚫 This event is now full. You can still join as a spectator to watch the draw.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Join Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {spotsRemaining > 0 ? 'Join the Sweep' : 'Watch as Spectator'}
            </CardTitle>
            <CardDescription>
              {spotsRemaining > 0
                ? 'Enter your details to join this Melbourne Cup sweep'
                : 'Enter your details to watch the draw and results'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your name"
                          className="text-lg"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This name will be displayed to other participants
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="0400 123 456"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  * Please provide either an email or phone number
                </div>

                <Separator />

                {event.lead_capture && (
                  <FormField
                    control={form.control}
                    name="marketingConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm">
                            I'd like to receive updates about future events at {event.tenant?.name}
                          </FormLabel>
                          <FormDescription>
                            Optional - we'll only send you information about Melbourne Cup events
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <Button
                  type="submit"
                  className="w-full text-lg py-6 hover:opacity-90 transition-opacity"
                  disabled={isLoading || (spotsRemaining <= 0 && event.status !== 'lobby')}
                  style={{
                    backgroundColor: brandColors.primary,
                    color: 'white',
                    border: 'none'
                  }}
                >
                  {isLoading ? (
                    'Joining...'
                  ) : spotsRemaining > 0 ? (
                    '🎲 Join the Sweep'
                  ) : (
                    '👀 Join as Spectator'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            By joining, you agree to the event terms and conditions.
            {event.mode === 'sweep' && ' Random draw will determine horse assignments.'}
          </p>
        </div>
      </div>
    </div>
  )
}