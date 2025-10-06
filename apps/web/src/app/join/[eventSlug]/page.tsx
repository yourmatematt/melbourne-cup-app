'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PatronJoinExperience } from '@/components/patron/patron-join-experience'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function JoinEventPage() {
  const params = useParams()
  const eventSlug = params.eventSlug as string
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchEvent() {
      if (!eventSlug) return

      try {
        // First get the tenant by slug
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('slug', eventSlug)
          .single()

        if (tenantError || !tenant) {
          setError('Event not found')
          return
        }

        // Get the latest active event for this tenant
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select(`
            *,
            tenants!tenant_id(*)
          `)
          .eq('tenant_id', tenant.id)
          .in('status', ['lobby', 'drawing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (eventError || !eventData) {
          setError('No active events found for this venue')
          return
        }

        setEvent(eventData)
      } catch (err) {
        console.error('Error fetching event:', err)
        setError('Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventSlug, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-600 mb-4" />
            <p className="text-gray-600">Loading event...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Event Not Found</CardTitle>
            <CardDescription>
              {error || 'The event you\'re looking for doesn\'t exist or is no longer active.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              Please check your link or contact the venue for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <PatronJoinExperience event={event} />
}