'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'qrcode.react'
import { Loader2, AlertCircle } from 'lucide-react'

interface Event {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  tenants?: {
    id: string
    name: string
  }
}

export default function QRPosterPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate the join URL
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${eventId}/enter`
    : `https://melbournecup.app/events/${eventId}/enter`

  useEffect(() => {
    if (eventId) {
      loadEventData()
    } else {
      setError('Event ID is missing')
      setLoading(false)
    }
  }, [eventId])

  async function loadEventData() {
    try {
      setLoading(true)
      setError(null)

      const { data, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          starts_at,
          status,
          capacity,
          tenants!inner (
            id,
            name
          )
        `)
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError

      setEvent(data)
    } catch (err) {
      console.error('Error loading event:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  // Auto-print when page loads
  useEffect(() => {
    if (event && !loading && !error) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.print()
      }, 1000)
    }
  }, [event, loading, error])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 mb-2">Error loading event</p>
          <p className="text-gray-600 text-sm">{error || 'Event not found'}</p>
        </div>
      </div>
    )
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4;
            margin: 2cm;
          }

          .no-print {
            display: none !important;
          }

          .print-poster {
            width: 100% !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
            background: white !important;
            color: black !important;
            font-family: 'Arial', sans-serif !important;
          }
        }

        /* Screen styles */
        .print-poster {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          background: white;
          color: black;
          padding: 2rem;
        }
      `}</style>

      <div className="print-poster">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Join the Melbourne Cup Sweep
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-blue-600 mb-2">
            {event.name}
          </h2>
          <p className="text-lg md:text-xl text-gray-700 mb-2">
            {event.tenants?.name}
          </p>
          <p className="text-base md:text-lg text-gray-600">
            {formatEventDate(event.starts_at)}
          </p>
        </div>

        {/* QR Code */}
        <div className="mb-8 p-8 bg-white border-4 border-gray-200 rounded-lg shadow-lg">
          <QRCode
            value={joinUrl}
            size={300}
            level="H"
            includeMargin={true}
            className="block mx-auto"
          />
        </div>

        {/* Instructions */}
        <div className="mb-8 max-w-2xl">
          <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
            How to Join:
          </h3>
          <div className="text-base md:text-lg text-gray-700 space-y-3">
            <p>
              <span className="font-semibold">1.</span> Scan the QR code with your phone camera
            </p>
            <p>
              <span className="font-semibold">2.</span> Enter your details to join the sweep
            </p>
            <p>
              <span className="font-semibold">3.</span> Wait for the draw to see which horse you get!
            </p>
          </div>
        </div>

        {/* Event Details */}
        <div className="border-t-2 border-gray-200 pt-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Capacity</h4>
              <p className="text-2xl font-bold text-blue-600">{event.capacity}</p>
              <p className="text-sm text-gray-600">participants</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Status</h4>
              <p className="text-lg font-semibold text-green-600 capitalize">
                {event.status === 'active' ? 'Open for Signups' : event.status}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Join URL</h4>
              <p className="text-xs text-gray-600 break-all font-mono">
                {joinUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Powered by Melbourne Cup Sweep Platform
          </p>
        </div>
      </div>

      {/* Screen-only controls */}
      <div className="no-print fixed top-4 right-4 space-x-2">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Print Poster
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-600 text-white px-4 py-2 rounded shadow hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </>
  )
}