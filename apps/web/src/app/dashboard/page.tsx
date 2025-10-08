'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Calendar, Users, TrendingUp, Clock, Play, Trophy, QrCode, ExternalLink, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { QRCodeShare } from '@/components/ui/qr-code'
import { AddParticipantModal } from '@/components/shared/add-participant-modal'

type Event = {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  mode: string
  created_at: string
  participant_count?: number
}

function DashboardContent() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [tenant, setTenant] = useState<any>(null)
  const [stats, setStats] = useState({ totalEvents: 0, activeParticipants: 0, revenue: 0 })
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventParticipants, setEventParticipants] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchUserAndEvents()
  }, [])

  async function fetchUserAndEvents() {
    try {
      console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING')
      console.log('Supabase client:', supabase)
      console.log('Fetching user and events...')

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Try to get tenant data, but don't require it
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantUser && !tenantError) {
        setTenant(tenantUser)

        // Fetch events via API route only if tenant exists
        const response = await fetch(`/api/events?tenant_id=${tenantUser.tenant_id}`)
        const { data: eventsData, error: eventsError } = await response.json()

        if (eventsError) {
          console.error('Error fetching events:', eventsError)
          setEvents([])
        } else {
          const eventsWithCounts = await Promise.all(
            (eventsData || []).map(async (event: any) => {
              const { count } = await supabase
                .from('patron_entries')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event.id)

              return {
                ...event,
                participant_count: count || 0
              }
            })
          )

          setEvents(eventsWithCounts)

          const totalEvents = eventsWithCounts.length
          const activeParticipants = eventsWithCounts.reduce((sum, event) => sum + (event.participant_count || 0), 0)

          setStats({
            totalEvents,
            activeParticipants,
            revenue: 0
          })
        }
      } else {
        // No tenant found - set empty state
        console.log('No tenant found for user, showing empty dashboard')
        setTenant(null)
        setEvents([])
        setStats({ totalEvents: 0, activeParticipants: 0, revenue: 0 })
      }


    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
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

      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === selectedEvent.id
            ? { ...event, participant_count: count || 0 }
            : event
        )
      )

      fetchUserAndEvents()
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4 text-gray-500" />
      case 'active': return <Play className="h-4 w-4 text-green-500" />
      case 'completed': return <Trophy className="h-4 w-4 text-yellow-500" />
      default: return <Calendar className="h-4 w-4 text-gray-500" />
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'draft': return 'Draft'
      case 'active': return 'Active'
      case 'drawing': return 'Drawing'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600">Error: {error}</p>
              <Button onClick={fetchUserAndEvents} className="mt-4">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <p className="mt-2 text-gray-600">
              Welcome to your Melbourne Cup venue management
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/settings">
              <Button variant="outline">
                Edit Venue Settings
              </Button>
            </Link>
            <Link href="/dashboard/events/new">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-gray-900" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalEvents === 0 ? 'No events created yet' : `${events.filter(e => e.status === 'active').length} active`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
              <Users className="h-4 w-4 text-gray-700" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-700">{stats.activeParticipants}</div>
              <p className="text-xs text-muted-foreground">
                Across {stats.totalEvents} events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">$0</div>
              <p className="text-xs text-muted-foreground">
                Coming soon
              </p>
            </CardContent>
          </Card>
        </div>

        {events.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Events</h2>
              <Link href="/dashboard/events">
                <Button variant="outline">View All</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {events.slice(0, 4).map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(event.status)}
                        <span className="text-sm text-gray-600">{getStatusText(event.status)}</span>
                      </div>
                    </div>
                    <CardDescription>
                      {new Date(event.starts_at).toLocaleDateString('en-AU', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{event.participant_count || 0}</span> / {event.capacity} participants
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddParticipant(event)}
                            disabled={(event.participant_count ?? 0) >= (event.capacity ?? 0)}
                            title={(event.participant_count ?? 0) >= (event.capacity ?? 0) ? 'Event is full' : 'Add participant manually'}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            {(event.participant_count ?? 0) >= (event.capacity ?? 0) ? 'Full' : 'Add'}
                          </Button>
                          <Link href={`/dashboard/events/${event.id}`}>
                            <Button size="sm">Manage</Button>
                          </Link>
                        </div>
                      </div>

                      {event.status === 'active' && (
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Share for patron signups:
                            </div>
                            <div className="flex space-x-2">
                              <QRCodeShare
                                eventId={event.id}
                                eventName={event.name}
                                isActive={event.status === 'active'}
                                size="md"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const url = `${window.location.origin}/e/${event.id}`
                                  window.open(url, '_blank')
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {event.status === 'draft' && (
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-400">
                              QR code available when event is active
                            </div>
                            <QRCodeShare
                              eventId={event.id}
                              eventName={event.name}
                              isActive={false}
                              size="md"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{events.length === 0 ? 'Create Your First Event' : 'Create Another Event'}</CardTitle>
              <CardDescription>
                {events.length === 0 ? 'Create your first Melbourne Cup event' : 'Add another event for your venue'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Set up a sweep or calcutta for Melbourne Cup 2025. Our templates make it easy to get started with all the horse details pre-filled.
              </p>
              <Link href="/dashboard/events/new">
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Melbourne Cup Event
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest venue activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm text-gray-600">
                  {events.length === 0 ? 'No activity yet. Create your first event to get started!' : 'Activity tracking coming soon...'}
                </p>
              </div>
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

export default function DashboardPage() {
  return <DashboardContent />
}