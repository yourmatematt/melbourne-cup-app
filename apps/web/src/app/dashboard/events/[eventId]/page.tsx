'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { StatusPill } from '@/components/ui/status-pill'
import { AddParticipantModal } from '@/components/shared/add-participant-modal'
import {
  ChevronRight,
  Settings,
  Users,
  Trophy,
  Calendar,
  UserPlus,
  Clock,
  Play
} from 'lucide-react'

type Event = {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  mode: 'sweep' | 'calcutta'
  created_at: string
}

type Participant = {
  id: string
  participant_name: string
  email: string
  phone?: string
  horse_number?: number
  horse_name?: string
  created_at: string
}

const SEGMENTED_TABS = [
  { id: 'control', label: 'Event Control', href: '' },
  { id: 'qr', label: 'QR Code Display', href: '/qr' },
  { id: 'analytics', label: 'Analytics', href: '/analytics' },
  { id: 'results', label: 'Enter Results', href: '/results' },
  { id: 'live', label: 'Live View', href: '/live' },
  { id: 'export', label: 'Export Data', href: '/export' },
  { id: 'settings', label: 'Settings', href: '/settings' }
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
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

function SegmentedControl({ eventId, activeTab }: { eventId: string, activeTab: string }) {
  return (
    <div className="bg-[#f8f7f4] border border-gray-200/50 rounded-2xl p-1.5 inline-flex">
      {SEGMENTED_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/dashboard/events/${eventId}${tab.href}`}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-gradient-to-b from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

function ParticipantRow({ participant }: { participant: Participant }) {
  const initials = getInitials(participant.participant_name)

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/50 transition-colors">
      <div className="bg-gradient-to-b from-orange-500 via-pink-500 to-purple-600 rounded-full size-10 flex items-center justify-center">
        <span className="text-white text-sm font-medium">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {participant.participant_name}
        </p>
        <p className="text-xs text-slate-600 truncate">
          {participant.email}
        </p>
      </div>

      <div>
        {participant.horse_number ? (
          <div className="bg-violet-100 border border-violet-200/60 rounded-full px-2.5 py-1">
            <span className="text-xs font-medium text-violet-700">
              Horse #{participant.horse_number} - {participant.horse_name || 'TBD'}
            </span>
          </div>
        ) : (
          <div className="bg-gray-100 border border-gray-200/60 rounded-full px-2.5 py-1">
            <span className="text-xs font-medium text-slate-600">
              Not assigned
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function HorseButton({ number, isAssigned, onClick }: {
  number: number
  isAssigned: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full aspect-square rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-colors ${
        isAssigned
          ? 'bg-violet-100 border-violet-200/60 text-violet-700'
          : 'bg-[#f8f7f4] border-gray-200/60 text-slate-600 hover:bg-gray-100'
      }`}
    >
      #{number}
    </button>
  )
}

function EventOverviewContent() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)

  useEffect(() => {
    fetchEventData()
  }, [eventId])

  async function fetchEventData() {
    try {
      setLoading(true)

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

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('tenant_id', tenantUser.tenant_id)
        .single()

      if (eventError) throw eventError
      if (!eventData) throw new Error('Event not found')

      setEvent(eventData)

      // Fetch participants and their assignments separately for now
      const { data: participantsData, error: participantsError } = await supabase
        .from('patron_entries')
        .select(`
          id,
          participant_name,
          email,
          phone,
          created_at
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (participantsError) throw participantsError

      // Fetch assignments to get horse numbers
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          patron_entry_id,
          event_horses!inner(
            horse_number,
            name
          )
        `)
        .in('patron_entry_id', (participantsData || []).map(p => p.id))

      if (assignmentsError) {
        console.warn('Could not fetch assignments:', assignmentsError)
      }

      // Create a map of participant ID to horse assignment
      const assignmentMap = new Map()
      if (assignmentsData) {
        assignmentsData.forEach(assignment => {
          assignmentMap.set(assignment.patron_entry_id, {
            horse_number: assignment.event_horses.horse_number,
            horse_name: assignment.event_horses.name
          })
        })
      }

      // Transform the data to match our Participant type
      const transformedParticipants = (participantsData || []).map((p: any) => {
        const assignment = assignmentMap.get(p.id)
        return {
          id: p.id,
          participant_name: p.participant_name,
          email: p.email,
          phone: p.phone,
          created_at: p.created_at,
          horse_number: assignment?.horse_number,
          horse_name: assignment?.horse_name
        }
      })

      setParticipants(transformedParticipants)
    } catch (err) {
      console.error('Error fetching event data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch event data')
    } finally {
      setLoading(false)
    }
  }

  async function handleParticipantAdded() {
    await fetchEventData()
    setShowAddParticipantModal(false)
  }

  function handleHorseClick(horseNumber: number) {
    // TODO: Implement horse assignment logic
    console.log(`Horse ${horseNumber} clicked`)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading event...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !event) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600">Error: {error || 'Event not found'}</p>
            <button
              onClick={fetchEventData}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const assignedHorses = new Set(
    participants
      .filter(p => p.horse_number)
      .map(p => p.horse_number!)
  )

  const stats = {
    participants: `${participants.length} / ${event.capacity}`,
    horsesAssigned: `${assignedHorses.size} / 24`,
    eventType: event.mode === 'sweep' ? 'Sweep' : 'Calcutta'
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="text-slate-900">{event.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{event.name}</h1>
              <StatusPill
                label={event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                variant={event.status as any}
                icon={getStatusIcon(event.status)}
              />
            </div>
            <p className="text-slate-600">
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

          <Link href={`/dashboard/events/${eventId}/settings`}>
            <button className="bg-[#f8f7f4] border border-gray-200/50 h-9 px-4 rounded-xl flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-50">
              <Settings className="h-4 w-4" />
              Event Settings
            </button>
          </Link>
        </div>

        {/* Segmented Control */}
        <div>
          <SegmentedControl eventId={eventId} activeTab="control" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6">
          <StatCard
            title="Participants"
            value={stats.participants}
            subtitle="Current registrations"
            icon={Users}
          />
          <StatCard
            title="Horses Assigned"
            value={stats.horsesAssigned}
            subtitle="Total assignments"
            icon={Trophy}
          />
          <StatCard
            title="Event Type"
            value={stats.eventType}
            subtitle="Competition format"
            icon={Calendar}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-2 gap-6">
          {/* Participants Column */}
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Participants</h3>
              <button
                onClick={() => setShowAddParticipantModal(true)}
                className="bg-[#f8f7f4] border border-gray-200/50 h-8 px-3 rounded-xl flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-50"
              >
                <UserPlus className="h-4 w-4" />
                Add Participant
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {participants.length > 0 ? (
                participants.map((participant) => (
                  <ParticipantRow key={participant.id} participant={participant} />
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600">No participants yet</p>
                  <button
                    onClick={() => setShowAddParticipantModal(true)}
                    className="mt-2 text-blue-600 text-sm hover:text-blue-700"
                  >
                    Add the first participant
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Horse Field Column */}
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Horse Field</h3>
              <span className="text-sm text-slate-600">24 runners</span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((number) => (
                <HorseButton
                  key={number}
                  number={number}
                  isAssigned={assignedHorses.has(number)}
                  onClick={() => handleHorseClick(number)}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="border-t border-gray-200/50 pt-4 flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-violet-100 border border-violet-200/60 rounded"></div>
                <span className="text-xs text-slate-600">Taken</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#f8f7f4] border border-gray-200/60 rounded"></div>
                <span className="text-xs text-slate-600">Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Participant Modal */}
      {event && (
        <AddParticipantModal
          isOpen={showAddParticipantModal}
          onOpenChange={setShowAddParticipantModal}
          event={event}
          participants={participants}
          onParticipantAdded={handleParticipantAdded}
        />
      )}
    </DashboardLayout>
  )
}

export default function EventOverviewPage() {
  return <EventOverviewContent />
}