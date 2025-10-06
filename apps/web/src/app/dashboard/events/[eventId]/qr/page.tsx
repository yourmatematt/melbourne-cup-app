'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import QRCode from 'qrcode.react'
import {
  ArrowLeft,
  Download,
  Copy,
  ExternalLink,
  Printer,
  RefreshCw,
  Users,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Event {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  participant_count?: number
  tenant: {
    name: string
  }
}

export default function EventQRPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/e/${eventId || ''}`
    : `https://melcup.app/e/${eventId || ''}`

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

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        router.push('/login')
        return
      }

      // Get user's tenant ID
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantError) throw tenantError

      // Get event details with tenant info
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          starts_at,
          status,
          capacity,
          tenants!tenant_id (
            name
          )
        `)
        .eq('id', eventId)
        .eq('tenant_id', tenantUser.tenant_id)
        .single()

      if (eventError) throw eventError
      if (!eventData) throw new Error('Event not found')

      // Get participant count
      const { count } = await supabase
        .from('patron_entries')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      setEvent({
        ...eventData,
        participant_count: count || 0,
        tenant: eventData.tenants || { name: 'Unknown Venue' }
      })

    } catch (err) {
      console.error('Error loading event:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success('URL copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy URL:', err)
      toast.error('Failed to copy URL')
    }
  }

  const handleDownloadQR = () => {
    const canvas = document.querySelector('#large-qr-canvas') as HTMLCanvasElement
    if (canvas && event?.name) {
      const link = document.createElement('a')
      link.download = `${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-qr-code.png`
      link.href = canvas.toDataURL()
      link.click()
      toast.success('QR code downloaded!')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleOpenUrl = () => {
    window.open(publicUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error || 'Event not found'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - hidden in print */}
      <div className="print:hidden bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/dashboard/events/${eventId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Event
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{event.name}</h1>
                <p className="text-sm text-gray-600">QR Code Display</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={handleCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadQR}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main QR Code Display */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4">
        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-4">
          {/* Event Header */}
          <div className="text-center mb-8 print:mb-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-3xl">
              {event.name}
            </h1>
            <p className="text-xl text-gray-600 mb-4 print:text-lg">
              Join the sweep by scanning the QR code
            </p>

            {/* Event Status and Info */}
            <div className="flex items-center justify-center space-x-6 mb-6 print:mb-4 print:space-x-4">
              <Badge
                variant={event.status === 'active' ? "default" : "secondary"}
                className="text-lg px-4 py-2 print:text-base"
              >
                {event.status === 'active' ? "✓ Active - Ready for signups" : "⏳ Not active yet"}
              </Badge>

              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="h-5 w-5" />
                <span className="text-lg print:text-base">
                  {event.participant_count} / {event.capacity} joined
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-gray-500 mb-8 print:mb-4">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(event.starts_at).toLocaleDateString('en-AU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Australia/Melbourne'
                })}
              </span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-6 print:space-y-4">
            <div className="bg-white p-8 rounded-lg border-4 border-gray-200 print:p-4 print:border-2">
              {publicUrl && (
                <QRCode
                  id="large-qr-canvas"
                  value={publicUrl}
                  size={320}
                  level="H"
                  includeMargin={true}
                  className="print:!w-64 print:!h-64"
                />
              )}
            </div>

            {/* Instructions */}
            <div className="text-center max-w-lg">
              <h3 className="text-xl font-semibold mb-3 print:text-lg">How to Join:</h3>
              <ol className="text-left space-y-2 text-gray-700 print:text-sm">
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">1</span>
                  <span>Open your phone's camera app</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">2</span>
                  <span>Point it at the QR code above</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">3</span>
                  <span>Tap the notification to open the signup form</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">4</span>
                  <span>Enter your details and you're in!</span>
                </li>
              </ol>
            </div>

            {/* URL for manual entry */}
            <div className="bg-gray-50 p-4 rounded-lg w-full max-w-lg print:bg-gray-100">
              <p className="text-sm text-gray-600 text-center mb-2">Or visit directly:</p>
              <p className="font-mono text-center text-sm break-all bg-white p-2 rounded border">
                {publicUrl}
              </p>
            </div>

            {/* Venue branding */}
            <div className="text-center pt-6 border-t print:pt-4">
              <p className="text-lg font-medium text-gray-900 print:text-base">
                {event.tenant?.name || 'Melbourne Cup Event'}
              </p>
              <p className="text-sm text-gray-600">
                Melbourne Cup 2025
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-xs text-gray-500 mt-4">
        Generated by Melbourne Cup Manager
      </div>
    </div>
  )
}