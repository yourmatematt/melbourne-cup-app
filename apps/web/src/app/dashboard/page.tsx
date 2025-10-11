'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AddParticipantModal } from '@/components/shared/add-participant-modal'
import { StatCard } from '@/components/ui/stat-card'
import { StatusPill } from '@/components/ui/status-pill'
import {
  Calendar,
  Users,
  TrendingUp,
  UserPlus,
  Settings,
  PlusCircle,
  Clock,
  Play,
  Trophy
} from 'lucide-react'

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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Try to get tenant data
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantUser && !tenantError) {
        setTenant(tenantUser)

        // Fetch events via API route
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
      case 'draft': return Clock
      case 'active': return Play
      case 'drawing': return Clock
      case 'completed': return Trophy
      default: return Calendar
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <button
              onClick={fetchUserAndEvents}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Welcome to your Melbourne Cup venue management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6">
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

        {/* Your Events */}
        {events.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Your Events</h2>
              <Link href="/dashboard/events">
                <button className="text-slate-600 hover:text-slate-900 text-sm">
                  View All
                </button>
              </Link>
            </div>

            <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 space-y-4">
              {events.slice(0, 1).map((event) => (
                <div key={event.id} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">{event.name}</h3>
                      <StatusPill
                        label={event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        variant={event.status as any}
                        icon={getStatusIcon(event.status)}
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
                      <button
                        onClick={() => handleAddParticipant(event)}
                        disabled={(event.participant_count ?? 0) >= (event.capacity ?? 0)}
                        className="bg-[#f8f7f4] border border-gray-200/50 h-8 px-3 rounded-xl flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add
                      </button>
                      <Link href={`/dashboard/events/${event.id}`}>
                        <button className="bg-slate-900 h-8 px-3 rounded-xl flex items-center gap-2 text-sm text-white hover:bg-slate-800">
                          <Settings className="h-4 w-4" />
                          Manage
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                {events.length === 0 ? 'Create Your First Event' : 'Create Another Event'}
              </h3>
              <p className="text-sm text-slate-600">
                Set up a sweep or calcutta for Melbourne Cup 2025. Our templates make it easy to get started with all the horse details pre-filled.
              </p>
            </div>
            <Link href="/dashboard/events/new">
              <button className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white h-9 rounded-xl flex items-center justify-center gap-2 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity">
                <PlusCircle className="h-4 w-4" />
                Create Melbourne Cup Event
              </button>
            </Link>
          </div>

          <div className="bg-white border border-gray-200/50 rounded-[20px] p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
              <p className="text-sm text-slate-600">Your latest venue activities</p>
            </div>
            <div className="text-center py-4">
              <p className="text-sm text-slate-600 text-center">
                {events.length === 0 ? 'No activity yet. Create your first event to get started!' : 'Activity tracking coming soon...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Participant Modal */}
      {selectedEvent && (
        <AddParticipantModal
          isOpen={showAddParticipantModal}
          onOpenChange={setShowAddParticipantModal}
          event={selectedEvent}
          participants={eventParticipants}
          onParticipantAdded={handleParticipantAdded}
        />
      )}
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}