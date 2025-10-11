'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { StatusPill } from '@/components/ui/status-pill'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Users,
  Trophy,
  Clock,
  Play,
  Plus,
  Settings,
  Eye
} from 'lucide-react'

interface Event {
  id: string
  name: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  starts_at: string
  capacity: number
  created_at: string
  participant_count?: number
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

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-AU', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function EventCard({ event }: { event: Event }) {
  const participantPercentage = Math.round((event.participant_count || 0) / event.capacity * 100)

  return (
    <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 space-y-4">
      <div className="flex items-start justify-between">
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
            {formatDateTime(event.starts_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/events/${event.id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/dashboard/events/${event.id}`}>
            <Button size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-slate-600 uppercase tracking-wider font-medium">Participants</p>
          <div className="flex items-center gap-2 mt-1">
            <Users className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">
              {event.participant_count || 0} / {event.capacity}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-600 uppercase tracking-wider font-medium">Fill Rate</p>
          <p className="text-sm font-medium text-slate-900 mt-1">
            {participantPercentage}%
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-600 uppercase tracking-wider font-medium">Created</p>
          <p className="text-sm font-medium text-slate-900 mt-1">
            {new Date(event.created_at).toLocaleDateString('en-AU', {
              month: 'short',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200/50">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/events/${event.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Manage Event
            </Button>
          </Link>
          <Link href={`/dashboard/events/${event.id}/control`}>
            <Button variant="gradient" className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Draw Controls
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function EventsContent() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
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

      // Fetch events for this tenant
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', tenantUser.tenant_id)
        .order('created_at', { ascending: false })

      if (eventsError) throw eventsError

      // Get participant counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
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

    } catch (err) {
      console.error('Error loading events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading events...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadEvents}>Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const stats = {
    totalEvents: events.length,
    activeEvents: events.filter(e => e.status === 'active').length,
    totalParticipants: events.reduce((sum, event) => sum + (event.participant_count || 0), 0)
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Events</h1>
            <p className="text-slate-600">Manage your Melbourne Cup sweeps and calcuttas</p>
          </div>

          <Link href="/dashboard/events/new">
            <Button variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Create New Event
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        {events.length > 0 && (
          <div className="grid grid-cols-3 gap-6">
            <StatCard
              title="Total Events"
              value={stats.totalEvents}
              subtitle={`${stats.activeEvents} currently active`}
              icon={Calendar}
            />
            <StatCard
              title="Total Participants"
              value={stats.totalParticipants}
              subtitle="Across all events"
              icon={Users}
            />
            <StatCard
              title="Completion Rate"
              value={`${Math.round((events.filter(e => e.status === 'completed').length / events.length) * 100)}%`}
              subtitle="Events completed"
              icon={Trophy}
            />
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-12 text-center">
            <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Events Yet</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Create your first Melbourne Cup event to get started with running sweeps and calcuttas at your venue.
            </p>
            <Link href="/dashboard/events/new">
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Your Events</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function EventsPage() {
  return <EventsContent />
}