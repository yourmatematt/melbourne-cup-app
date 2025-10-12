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
  Trophy,
  Radio,
  Clipboard,
  Mic,
  CheckCircle,
  Plus,
  ChevronDown
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

  // Calculate event counts by status
  const eventCounts = {
    active: events.filter(e => e.status === 'active').length,
    draft: events.filter(e => e.status === 'draft').length,
    drawing: events.filter(e => e.status === 'drawing').length,
    completed: events.filter(e => e.status === 'completed').length
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        {/* Header */}
        <div className="flex items-center justify-between h-[64px] mb-8">
          <div className="h-[64px] w-[307.906px]">
            <div className="flex flex-col gap-1 h-[64px]">
              <h1 className="text-[24px] leading-[36px] font-['Arial:Regular',_sans-serif] text-slate-900">Dashboard</h1>
              <p className="text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-600">Manage your events and track performance</p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex gap-4 h-[44px] w-[356.984px]">
            {/* Create Event Button */}
            <Link href="/dashboard/events/create">
              <button className="bg-gradient-to-b from-[#ff6b35] to-[#a855f7] text-white px-6 py-0 rounded-[8px] shadow-[0px_2px_8px_0px_rgba(168,85,247,0.3)] h-[44px] w-[153.672px] flex items-center gap-2 hover:opacity-90 transition-opacity">
                <Plus className="w-[18px] h-[18px]" />
                <span className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold leading-[20px]">Create Event</span>
              </button>
            </Link>

            {/* Venue Dropdown */}
            <div className="bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)] rounded-[8px] px-[17px] py-[1px] flex items-center gap-2 flex-1 h-[44px]">
              <div className="w-6 h-6 bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full flex items-center justify-center">
                <span className="text-white text-[12px] font-['Arial:Regular',_sans-serif] leading-[16px]">T</span>
              </div>
              <span className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-gray-800 flex-1">The Royal Hotel</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Stats Grid - 4 columns */}
        <div className="grid grid-cols-4 gap-6 h-[134px] mb-8">
          <StatCard
            title="Active Events"
            value={eventCounts.active}
            subtitle="Currently running"
            icon={Radio}
          />
          <StatCard
            title="Draft Events"
            value={eventCounts.draft}
            subtitle="Not started"
            icon={Clipboard}
          />
          <StatCard
            title="Drawing"
            value={eventCounts.drawing}
            subtitle="Ready to draw"
            icon={Mic}
          />
          <StatCard
            title="Complete"
            value={eventCounts.completed}
            subtitle="Finished"
            icon={CheckCircle}
          />
        </div>

        {/* Events Grid OR Empty State */}
        {events.length === 0 ? (
          /* EMPTY STATE - Figma Design */
          <div className="flex items-center justify-center">
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] w-[600px] h-[418px] relative">
              {/* Icon and Content Container */}
              <div className="absolute left-[65px] top-[65px] w-[470px] h-[172px]">
                {/* Icon */}
                <div className="absolute left-[187px] top-0 w-[96px] h-[96px] rounded-full flex items-center justify-center">
                  <Trophy className="w-12 h-12 text-purple-600" />
                </div>

                {/* Heading */}
                <div className="absolute left-0 top-[112px] w-[470px] h-[24px]">
                  <h2 className="absolute left-1/2 top-[-2px] transform -translate-x-1/2 text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-900 whitespace-nowrap text-center">
                    No Events Yet
                  </h2>
                </div>

                {/* Description */}
                <div className="absolute left-0 top-[148px] w-[470px] h-[24px]">
                  <p className="absolute left-1/2 top-[-2px] transform -translate-x-1/2 text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-600 whitespace-nowrap text-center">
                    Create your first Melbourne Cup sweep to get started
                  </p>
                </div>
              </div>

              {/* Create Button */}
              <Link href="/dashboard/events/create">
                <button className="absolute left-[190.3px] top-[269px] w-[219.391px] h-[48px] bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-[12px] flex items-center text-white hover:opacity-90 transition-opacity">
                  <Plus className="w-4 h-4 ml-3 mr-2" />
                  <span className="text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif]">Create Your First Event</span>
                </button>
              </Link>

              {/* Subtext */}
              <div className="absolute left-[65px] top-[333px] w-[470px] h-[20px]">
                <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600 text-center">
                  Takes less than 2 minutes
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* EVENTS GRID - When there are events */
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900">Your Events</h2>
              <span className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">{events.length} total events</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {events.map((event) => (
                <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                  <div className="bg-white rounded-[20px] p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    {/* Status and Price */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                        event.status === 'active' ? 'bg-green-100 text-green-700' :
                        event.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        event.status === 'drawing' ? 'bg-purple-100 text-purple-700' :
                        event.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {event.status}
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-slate-600">Pool</div>
                        <div className="text-[16px] leading-[24px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900">$240</div>
                      </div>
                    </div>

                    {/* Event Name */}
                    <h3 className="text-[18px] leading-[24px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                      {event.name}
                    </h3>

                    {/* Date */}
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      <span className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
                        {new Date(event.starts_at).toLocaleDateString('en-AU', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })} at {new Date(event.starts_at).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[#ff6b35] to-[#a855f7] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(((event.participant_count || 0) / event.capacity) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 text-center text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif]">
                      <div>
                        <div className="text-slate-600">Participants</div>
                        <div className="font-bold text-slate-900">{event.participant_count || 0}/{event.capacity}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Paid</div>
                        <div className="font-bold text-green-600">{event.participant_count || 0}/{event.capacity}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Assigned</div>
                        <div className="font-bold text-slate-900">0/{event.capacity}</div>
                      </div>
                    </div>

                    {/* Action Button based on status */}
                    <div className="mt-4">
                      {event.status === 'draft' && (
                        <button className="w-full bg-gradient-to-r from-[#ff6b35] to-[#a855f7] text-white py-2.5 rounded-lg text-[14px] font-['Arial:Bold',_sans-serif] font-bold hover:opacity-90 transition-opacity">
                          Start Event
                        </button>
                      )}
                      {event.status === 'drawing' && (
                        <button className="w-full bg-gradient-to-r from-[#ff6b35] to-[#a855f7] text-white py-2.5 rounded-lg text-[14px] font-['Arial:Bold',_sans-serif] font-bold hover:opacity-90 transition-opacity">
                          Continue Draw
                        </button>
                      )}
                      {event.status === 'active' && (
                        <button className="w-full bg-gradient-to-r from-[#ff6b35] to-[#a855f7] text-white py-2.5 rounded-lg text-[14px] font-['Arial:Bold',_sans-serif] font-bold hover:opacity-90 transition-opacity">
                          Start Draw
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Call to Action for more events */}
            <div className="mt-8 bg-gray-50 rounded-[20px] p-6 text-center">
              <h3 className="text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-900 mb-2">Ready to create another event?</h3>
              <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-4">Set up a new Melbourne Cup sweep in less than 2 minutes</p>
              <Link href="/dashboard/events/create">
                <button className="bg-gradient-to-r from-[#ff6b35] to-[#a855f7] text-white px-6 py-2.5 rounded-lg text-[14px] font-['Arial:Bold',_sans-serif] font-bold hover:opacity-90 transition-opacity">
                  Create New Event
                </button>
              </Link>
            </div>
          </div>
        )}
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