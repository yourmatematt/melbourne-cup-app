'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { StatusPill } from '@/components/ui/status-pill'
import { Plus, Calendar, Users, TrendingUp, Clock, Play, Trophy, QrCode, ExternalLink, UserPlus, PlusCircle, Settings, Eye } from 'lucide-react'
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

  function getStatusIconComponent(status: string) {
    switch (status) {
      case 'draft': return Clock
      case 'active': return Play
      case 'drawing': return Clock
      case 'completed': return Trophy
      case 'cancelled': return Clock
      default: return Calendar
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
    <div className="min-h-screen bg-[#f8f7f4] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600">
              Welcome to your Melbourne Cup venue management
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/settings">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Edit Venue Settings
              </Button>
            </Link>
            <Link href="/dashboard/events/new">
              <Button className="bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            subtitle={stats.totalEvents === 0 ? 'No events created yet' : `${events.filter(e => e.status === 'active').length} active`}
            icon={Calendar}
          />

          <StatCard
            title="Active Participants"
            value={stats.activeParticipants}
            subtitle={`Across ${stats.totalEvents} events`}
            icon={Users}
          />

          <StatCard
            title="Revenue"
            value="$0"
            subtitle="Coming soon"
            icon={TrendingUp}
          />
        </div>

        {events.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Your Events</h2>
              <Link href="/dashboard/events">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                  View All
                </Button>
              </Link>
            </div>

            <Card className="bg-white border border-gray-200 rounded-[20px] p-6 shadow-sm">
              {events.slice(0, 1).map((event) => (
                <div key={event.id} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">{event.name}</h3>
                      <StatusPill
                        label={getStatusText(event.status)}
                        variant={event.status as any}
                        icon={getStatusIconComponent(event.status)}
                      />
                    </div>
                    <p className="text-sm text-slate-600">
                      {new Date(event.starts_at).toLocaleDateString('en-AU', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <Users className="h-4 w-4" />
                      <span>{event.participant_count || 0} / {event.capacity} participants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddParticipant(event)}
                        disabled={(event.participant_count ?? 0) >= (event.capacity ?? 0)}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add
                      </Button>
                      <Link href={`/dashboard/events/${event.id}`}>
                        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">{events.length === 0 ? 'Create Your First Event' : 'Create Another Event'}</h3>
                <p className="text-sm text-slate-600">
                  Set up a sweep or calcutta for Melbourne Cup 2025. Our templates make it easy to get started with all the horse details pre-filled.
                </p>
              </div>
              <Link href="/dashboard/events/new">
                <Button className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white hover:opacity-90 transition-opacity">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Melbourne Cup Event
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                <p className="text-sm text-slate-600">Your latest venue activities</p>
              </div>
              <div className="text-center py-4">
                <p className="text-sm text-slate-600">
                  {events.length === 0 ? 'No activity yet. Create your first event to get started!' : 'Activity tracking coming soon...'}
                </p>
              </div>
            </div>
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