'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ControlPanel } from '@/components/control/control-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function EventControlPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadEventAndCheckPermissions() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUser(user)

        // Load event with tenant info
        console.log('Loading event with ID:', eventId)
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select(`
            *,
            tenants!tenant_id(*)
          `)
          .eq('id', eventId)
          .single()

        if (eventError || !eventData) {
          console.error('Event query error:', eventError)
          console.log('Event data:', eventData)
          setError(eventError?.message || 'Event not found')
          return
        }

        // Check if user has permission to control this event
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('role')
          .eq('tenant_id', eventData.tenant_id)
          .eq('user_id', user.id)
          .single()

        if (!tenantUser || !['owner', 'host'].includes(tenantUser.role)) {
          setError('You do not have permission to control this event')
          return
        }

        setEvent(eventData)
      } catch (err) {
        console.error('Error loading event:', err)
        setError('Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      loadEventAndCheckPermissions()
    }
  }, [eventId, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading event controls...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              {error || 'You do not have permission to access this event control panel.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Please contact the event organizer if you believe this is an error.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/dashboard/events/${eventId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Button>
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-gray-600 mt-1">Event Control Panel</p>
              {event.tenant?.name && (
                <p className="text-sm text-gray-500">{event.tenant.name}</p>
              )}
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500">Status</div>
              <div className="capitalize font-medium text-lg">
                {event.status}
              </div>
            </div>
          </div>
        </div>

        {/* Main Control Panel */}
        <ControlPanel event={event} user={user} />
      </div>
    </div>
  )
}