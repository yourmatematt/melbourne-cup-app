'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Users, Clock, Play, Trophy, Share2, Settings, Plus, Eye, QrCode, Award } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AddParticipantModal } from '@/components/shared/add-participant-modal'

type Event = {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  mode: string
  lead_capture: boolean
  created_at: string
}

type Participant = {
  id: string
  participant_name: string
  email?: string
  phone?: string
  marketing_consent: boolean
  created_at: string
  assignments?: {
    event_horse: {
      number: number
      name: string
      jockey?: string
    }
  }[]
}

type Horse = {
  id: string
  number: number
  name: string
  jockey?: string
  is_scratched: boolean
  position?: number
  assigned?: boolean
}

export default function EventManagePage() {
  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [horses, setHorses] = useState<Horse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventParticipants, setEventParticipants] = useState<any[]>([])

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const eventId = params.eventId as string

  useEffect(() => {
    if (eventId) {
      fetchEventData()
    }
  }, [eventId])

  async function fetchEventData() {
    try {
      console.log('🔍 Fetching event data for:', eventId)
      setLoading(true)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        console.log('❌ No user found, redirecting to login')
        router.push('/login')
        return
      }

      setUser(user)

      // Get user's tenant ID
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantError) throw tenantError
      if (!tenantUser) throw new Error('No tenant found for user')

      console.log('✅ User tenant:', tenantUser.tenant_id)

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          starts_at,
          status,
          capacity,
          mode,
          lead_capture,
          created_at
        `)
        .eq('id', eventId)
        .eq('tenant_id', tenantUser.tenant_id)
        .single()

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          setError('Event not found or you do not have permission to view it')
          return
        }
        throw eventError
      }

      console.log('✅ Event found:', eventData.name)
      setEvent(eventData)

      // Fetch horses for this event
      const { data: horsesData, error: horsesError } = await supabase
        .from('event_horses')
        .select(`
          id,
          number,
          name,
          jockey,
          is_scratched,
          position
        `)
        .eq('event_id', eventId)
        .order('number', { ascending: true })

      if (horsesError) throw horsesError

      // Fetch participants and their assignments
      const { data: participantsData, error: participantsError } = await supabase
        .from('patron_entries')
        .select(`
          id,
          participant_name,
          email,
          phone,
          marketing_consent,
          created_at,
          assignments(
            event_horse:event_horses(
              number,
              name,
              jockey
            )
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (participantsError) throw participantsError

      console.log('✅ Participants:', participantsData?.length || 0)
      console.log('✅ Horses:', horsesData?.length || 0)

      // Mark which horses are assigned
      const assignedHorseNumbers = new Set(
        participantsData?.flatMap(p =>
          p.assignments?.map(a => a.event_horse?.number) || []
        ) || []
      )

      const horsesWithAssignments = horsesData?.map(horse => ({
        ...horse,
        assigned: assignedHorseNumbers.has(horse.number)
      })) || []

      setParticipants(participantsData || [])
      setHorses(horsesWithAssignments)

    } catch (err) {
      console.error('❌ Error fetching event data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch event data')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddParticipant(event: Event) {
    try {
      setSelectedEvent(event)

      const { data: participants, error } = await supabase
        .from('patron_entries')
        .select('id, participant_name, email, phone, marketing_consent, join_code, created_at')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching participants:', error)
        alert('Failed to load participant data')
        return
      }

      setEventParticipants(participants || [])
      setShowAddParticipantModal(true)
    } catch (err) {
      console.error('Error opening add participant modal:', err)
      alert('Failed to open add participant form')
    }
  }

  async function handleParticipantAdded() {
    if (selectedEvent) {
      const { count } = await supabase
        .from('patron_entries')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEvent.id)

      setParticipants(prevParticipants => {
        // Refresh participants data
        fetchEventData()
        return prevParticipants
      })
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Draft</Badge>
      case 'active':
        return <Badge variant="default" className="gap-1 bg-green-500"><Play className="h-3 w-3" />Active</Badge>
      case 'completed':
        return <Badge variant="default" className="gap-1 bg-yellow-500"><Trophy className="h-3 w-3" />Completed</Badge>
      case 'drawing':
        return <Badge variant="default" className="gap-1 bg-blue-500"><Play className="h-3 w-3" />Drawing</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading event...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchEventData}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-600">Event not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
              {getStatusBadge(event.status)}
            </div>
            <p className="text-gray-600">
              <Calendar className="inline mr-1 h-4 w-4" />
              {formatDateTime(event.starts_at)}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <Link href={`/dashboard/events/${eventId}/control`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Play className="mr-2 h-4 w-4" />
                Event Control
              </Button>
            </Link>
            <Link href={`/dashboard/events/${eventId}/qr`}>
              <Button variant="outline" size="sm" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                <QrCode className="mr-2 h-4 w-4" />
                QR Code Display
              </Button>
            </Link>
            <Link href={`/dashboard/events/${eventId}/analytics`}>
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href={`/dashboard/events/${eventId}/results`}>
              <Button variant="outline" size="sm" className={`${event?.status === 'completed' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' : ''}`}>
                <Award className="mr-2 h-4 w-4" />
                {event?.status === 'completed' ? 'Winners' : 'Enter Results'}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/events/${eventId}/live`, '_blank')}
            >
              <Eye className="mr-2 h-4 w-4" />
              Live View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('Export functionality coming soon')}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Link href={`/dashboard/events/${eventId}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participants</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {participants.length} / {event.capacity}
              </div>
              <p className="text-xs text-muted-foreground">
                {event.capacity - participants.length} spots remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horses Assigned</CardTitle>
              <Trophy className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {horses.filter(h => h.assigned).length} / {horses.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {horses.filter(h => !h.assigned && !h.is_scratched).length} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Event Type</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{event.mode}</div>
              <p className="text-xs text-muted-foreground">
                {event.lead_capture ? 'Lead capture enabled' : 'No lead capture'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Participants List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Participants</CardTitle>
                  <CardDescription>
                    Current registered participants for this event
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddParticipant(event)}
                  disabled={(participants.length) >= (event.capacity)}
                  title={(participants.length) >= (event.capacity) ? 'Event is full' : 'Add participant manually'}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {(participants.length) >= (event.capacity) ? 'Full' : 'Add Participant'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">No participants yet</p>
                  <p className="text-sm text-gray-500">
                    Share your event link to start collecting registrations
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{participant.participant_name}</p>
                          {participant.email && (
                            <p className="text-sm text-gray-500">{participant.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {participant.assignments && participant.assignments.length > 0 ? (
                          <div>
                            <p className="font-medium text-sm">
                              Horse #{participant.assignments[0].event_horse.number}
                            </p>
                            <p className="text-xs text-gray-500">
                              {participant.assignments[0].event_horse.name}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Horse Field */}
          <Card>
            <CardHeader>
              <CardTitle>Horse Field</CardTitle>
              <CardDescription>
                Current status of all horses in this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              {horses.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No horses configured</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {horses.map((horse) => (
                    <div
                      key={horse.id}
                      className={`p-3 border rounded-lg ${
                        horse.is_scratched
                          ? 'bg-red-50 border-red-200'
                          : horse.assigned
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">#{horse.number}</p>
                          <p className="text-sm text-gray-600">{horse.name}</p>
                          {horse.jockey && (
                            <p className="text-xs text-gray-500">{horse.jockey}</p>
                          )}
                        </div>
                        <div>
                          {horse.is_scratched ? (
                            <Badge variant="destructive">Scratched</Badge>
                          ) : horse.assigned ? (
                            <Badge variant="default" className="bg-green-500">Taken</Badge>
                          ) : (
                            <Badge variant="outline">Available</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {selectedEvent && (
        <AddParticipantModal
          isOpen={showAddParticipantModal}
          onOpenChange={setShowAddParticipantModal}
          event={selectedEvent}
          participants={eventParticipants}
          onParticipantAdded={handleParticipantAdded}
        />
      )}
    </div>
  )
}