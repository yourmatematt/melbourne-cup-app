'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  Calendar,
  Users,
  Trophy,
  CheckCircle,
  Clock,
  MapPin,
  Share2,
  Loader2
} from 'lucide-react'

interface Event {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  lead_capture: boolean
  tenant: {
    name: string
  }
}

interface FormData {
  fullName: string
  email: string
  phone: string
  marketingConsent: boolean
}

interface FormErrors {
  fullName?: string
  email?: string
  phone?: string
  general?: string
}

export default function PublicEntryPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    marketingConsent: false
  })

  const [formErrors, setFormErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (eventId) {
      loadEventData()
    }
  }, [eventId])

  async function loadEventData() {
    try {
      setLoading(true)
      setError(null)

      // Use the API route to get event data (bypasses RLS issues)
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'GET'
      })

      if (!response.ok) {
        setError('Event not found')
        return
      }

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to load event')
        return
      }

      // Check if event is accepting entries
      if (data.data.event.status !== 'active') {
        setError('This event is not currently accepting entries')
        return
      }

      setEvent(data.data.event)
      setParticipantCount(data.data.participantCount)

    } catch (err) {
      console.error('Error loading event:', err)
      setError('Failed to load event details')
    } finally {
      setLoading(false)
    }
  }

  function validateForm(): boolean {
    const errors: FormErrors = {}

    // Validate required fields
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required'
    }

    // Validate email format if provided
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Validate phone format if provided
    if (formData.phone.trim() && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) return

    if (!event) return

    // Check if event is full
    if (participantCount >= event.capacity) {
      setFormErrors({ general: 'Sorry, this event is full!' })
      return
    }

    setSubmitting(true)
    setFormErrors({})

    try {
      // Use the API route for registration
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          marketingConsent: formData.marketingConsent
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setFormErrors({ general: data.error || 'Failed to register. Please try again.' })
        return
      }

      // Format registration data for success page
      const registrationData = {
        id: data.data.participant.id,
        joinCode: data.data.participant.joinCode,
        name: data.data.participant.name,
        paymentStatus: 'paid' as const, // For free events, status is 'paid'
        paymentDeadline: null,
        paymentAmount: 0,
        requiresPayment: false,
        promo: {
          enabled: false,
          message: null,
          deadline: null,
          duration: 0
        },
        event: {
          id: data.data.event.id,
          name: data.data.event.name,
          entryFee: 0,
          paymentTimeoutMinutes: 0
        }
      }

      // Redirect to success page with formatted data
      const encodedData = encodeURIComponent(JSON.stringify(registrationData))
      router.push(`/events/${eventId}/success?data=${encodedData}`)

    } catch (err) {
      console.error('Registration error:', err)
      setFormErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({
        title: `Join ${event?.name}`,
        text: `Register for the ${event?.name} sweep!`,
        url: url
      })
    } else {
      navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading event...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Oops!</CardTitle>
            <CardDescription className="text-lg">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-green-600">You're In!</CardTitle>
            <CardDescription className="text-lg">
              Successfully registered for {event?.name}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-green-100 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-700 font-medium">Your Confirmation Code</p>
                <p className="text-2xl font-bold text-green-800 font-mono">{confirmationCode}</p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDateTime(event!.starts_at)}</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{event?.tenant.name}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• The draw will happen at the event</li>
                  <li>• You'll be assigned a random horse</li>
                  <li>• If your horse wins, you win!</li>
                  <li>• Keep this confirmation code safe</li>
                </ul>
              </div>

              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share with Friends
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const spotsRemaining = event ? event.capacity - participantCount : 0
  const isEventFull = spotsRemaining <= 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {event?.name}
          </CardTitle>
          <CardDescription className="text-lg">
            Join the sweep!
          </CardDescription>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{formatDateTime(event!.starts_at)}</span>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{event?.tenant.name}</span>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  {participantCount}/{event?.capacity} joined
                </span>
              </div>

              {spotsRemaining > 0 ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {spotsRemaining} spots left
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Event Full
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isEventFull ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-600 mb-2">Event Full</h3>
              <p className="text-gray-600">
                Sorry, this event has reached its capacity of {event?.capacity} participants.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{formErrors.general}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    className={`mt-1 ${formErrors.fullName ? 'border-red-300' : ''}`}
                    disabled={submitting}
                  />
                  {formErrors.fullName && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com (optional)"
                    className={`mt-1 ${formErrors.email ? 'border-red-300' : ''}`}
                    disabled={submitting}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0400 123 456 (optional)"
                    className={`mt-1 ${formErrors.phone ? 'border-red-300' : ''}`}
                    disabled={submitting}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>
                  )}
                </div>

                {event?.lead_capture && (
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      checked={formData.marketingConsent}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, marketingConsent: checked as boolean }))
                      }
                      disabled={submitting}
                    />
                    <Label htmlFor="consent" className="text-xs text-gray-600 leading-relaxed">
                      I agree to receive marketing communications from {event?.tenant.name}
                    </Label>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
                disabled={submitting || isEventFull}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Join the Sweep!
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By joining, you confirm you are eligible to participate in this event.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}