'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TVDisplay } from '@/components/tv/tv-display'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'

export default function TVDisplayPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadEvent() {
      try {
        // Load event with tenant and brand kit info
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select(`
            *,
            tenants!tenant_id(*)
          `)
          .eq('id', eventId)
          .single()

        if (eventError || !eventData) {
          setError('Event not found')
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
      loadEvent()
    }
  }, [eventId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-600 mb-4" />
            <p className="text-gray-300">Loading TV display...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <h1 className="text-xl font-bold text-red-400 mb-2">Display Error</h1>
            <p className="text-gray-300 text-center">
              {error || 'Unable to load the TV display for this event.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <TVDisplay event={event} />
}