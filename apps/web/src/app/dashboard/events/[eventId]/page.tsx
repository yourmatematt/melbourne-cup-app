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
  Users,
  Trophy,
  Calendar,
  UserPlus,
  Clock,
  Play,
  Shuffle,
  Zap,
  QrCode,
  BarChart3,
  Eye,
  Download,
  Settings,
  CheckCircle
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

type DrawStats = {
  assigned: number
  waiting: number
  availableHorses: number
  progressPercentage: number
}

const TABS = [
  { id: 0, label: 'Event Control', icon: Play },
  { id: 1, label: 'QR Code Display', icon: QrCode },
  { id: 2, label: 'Analytics', icon: BarChart3 },
  { id: 3, label: 'Race Results', icon: Trophy },
  { id: 4, label: 'Live View', icon: Eye },
  { id: 5, label: 'Export Data', icon: Download },
  { id: 6, label: 'Settings', icon: Settings }
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

function GradientProgressBar({ percentage, className }: { percentage: number, className?: string }) {
  return (
    <div className={`bg-[#f8f7f4] rounded-full h-3 overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-b from-[#FF8A00] via-[#FF4D8D] to-[#8B5CF6] rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function ActionCard({
  title,
  description,
  bulletPoints,
  buttonText,
  buttonIcon: ButtonIcon,
  onButtonClick,
  disabled = false,
  buttonVariant = 'primary'
}: {
  title: string
  description: string
  bulletPoints: string[]
  buttonText: string
  buttonIcon: React.ComponentType<{ className?: string }>
  onButtonClick: () => void
  disabled?: boolean
  buttonVariant?: 'primary' | 'secondary'
}) {
  return (
    <div className="bg-white border border-gray-200/50 rounded-[20px] p-8 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-[20px] size-12 flex items-center justify-center ${
            buttonVariant === 'primary' ? 'bg-slate-100' : 'bg-violet-100'
          }`}>
            <ButtonIcon className={`h-6 w-6 ${
              buttonVariant === 'primary' ? 'text-slate-600' : 'text-violet-500'
            }`} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>

        <p className="text-slate-600">{description}</p>

        <ul className="space-y-1">
          {bulletPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="text-violet-500 mt-1">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onButtonClick}
        disabled={disabled}
        className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
          buttonVariant === 'primary'
            ? 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400'
            : 'bg-[#f8f7f4] border-2 border-violet-200/60 text-violet-500 hover:bg-violet-50 disabled:opacity-50'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <ButtonIcon className="h-4 w-4" />
        {buttonText}
      </button>
    </div>
  )
}

function ParticipantRow({ participant }: { participant: Participant }) {
  const initials = getInitials(participant.participant_name)

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/50 transition-colors">
      <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-full size-10 flex items-center justify-center">
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

function TabMenu({ activeTab, setActiveTab }: { activeTab: number, setActiveTab: (tab: number) => void }) {
  return (
    <div className="bg-[#F8F7F4] border border-black/8 rounded-2xl p-1.5 inline-flex">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-gradient-to-b from-[#FF8A00] via-[#FF4D8D] to-[#8B5CF6] text-white shadow-lg'
              : 'text-slate-600 hover:bg-black/5'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
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
  const [activeTab, setActiveTab] = useState(0)
  const [drawStats, setDrawStats] = useState<DrawStats>({
    assigned: 0,
    waiting: 0,
    availableHorses: 24,
    progressPercentage: 0
  })
  const [isDrawing, setIsDrawing] = useState(false)

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

      // Fetch participants and their assignments separately
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

      // Calculate stats
      const assigned = transformedParticipants.filter(p => p.horse_number).length
      const waiting = transformedParticipants.filter(p => !p.horse_number).length
      const availableHorses = 24 - assigned
      const progressPercentage = Math.round((assigned / 24) * 100)

      setDrawStats({
        assigned,
        waiting,
        availableHorses,
        progressPercentage
      })

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

  async function handleDrawNext() {
    if (isDrawing || drawStats.waiting === 0 || drawStats.availableHorses === 0) return

    try {
      setIsDrawing(true)

      // Find the next waiting participant (oldest first)
      const nextParticipant = participants
        .filter(p => !p.horse_number)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]

      if (!nextParticipant) {
        throw new Error('No participants waiting for assignment')
      }

      // Get all assigned horse numbers
      const assignedNumbers = new Set(
        participants
          .filter(p => p.horse_number)
          .map(p => p.horse_number!)
      )

      // Get available horse numbers (1-24)
      const availableNumbers = Array.from({ length: 24 }, (_, i) => i + 1)
        .filter(num => !assignedNumbers.has(num))

      if (availableNumbers.length === 0) {
        throw new Error('No horses available for assignment')
      }

      // Randomly select an available horse
      const randomHorse = availableNumbers[Math.floor(Math.random() * availableNumbers.length)]

      // Get horse details
      const { data: horseData, error: horseError } = await supabase
        .from('event_horses')
        .select('id, name')
        .eq('event_id', eventId)
        .eq('horse_number', randomHorse)
        .single()

      if (horseError) throw horseError

      // Create the assignment
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          patron_entry_id: nextParticipant.id,
          event_horse_id: horseData.id
        })

      if (assignmentError) throw assignmentError

      // Show success notification
      console.log(`🎉 ${nextParticipant.participant_name} assigned to Horse #${randomHorse} - ${horseData.name}`)

      // Refresh data
      await fetchEventData()

    } catch (err) {
      console.error('Error drawing next participant:', err)
      alert(err instanceof Error ? err.message : 'Failed to draw next participant')
    } finally {
      setIsDrawing(false)
    }
  }

  async function handleDrawAll() {
    if (isDrawing || drawStats.waiting === 0 || drawStats.availableHorses === 0) return

    const confirmMessage = `This will assign horses to all ${drawStats.waiting} waiting participants. Continue?`
    if (!confirm(confirmMessage)) return

    try {
      setIsDrawing(true)

      // Get waiting participants (oldest first)
      const waitingParticipants = participants
        .filter(p => !p.horse_number)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      // Get all assigned horse numbers
      const assignedNumbers = new Set(
        participants
          .filter(p => p.horse_number)
          .map(p => p.horse_number!)
      )

      // Get available horse numbers (1-24)
      const availableNumbers = Array.from({ length: 24 }, (_, i) => i + 1)
        .filter(num => !assignedNumbers.has(num))

      if (availableNumbers.length < waitingParticipants.length) {
        throw new Error('Not enough horses available for all participants')
      }

      // Shuffle available horses
      const shuffledHorses = [...availableNumbers].sort(() => Math.random() - 0.5)

      // Get horse details for all horses we'll assign
      const { data: horsesData, error: horsesError } = await supabase
        .from('event_horses')
        .select('id, horse_number, name')
        .eq('event_id', eventId)
        .in('horse_number', shuffledHorses.slice(0, waitingParticipants.length))

      if (horsesError) throw horsesError

      // Create horse number to ID mapping
      const horseMap = new Map()
      horsesData.forEach(horse => {
        horseMap.set(horse.horse_number, horse.id)
      })

      // Create assignments
      const assignments = waitingParticipants.map((participant, index) => ({
        patron_entry_id: participant.id,
        event_horse_id: horseMap.get(shuffledHorses[index])
      }))

      // Insert all assignments
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert(assignments)

      if (assignmentError) throw assignmentError

      // Show success notification
      console.log(`🎉 Successfully assigned ${assignments.length} horses!`)

      // Refresh data
      await fetchEventData()

    } catch (err) {
      console.error('Error drawing all participants:', err)
      alert(err instanceof Error ? err.message : 'Failed to draw all participants')
    } finally {
      setIsDrawing(false)
    }
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

  const allAssigned = drawStats.waiting === 0

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Event Control
        return (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-6">
              <StatCard
                title="Participants"
                value={`${participants.length} / ${event.capacity}`}
                subtitle="Current registrations"
                icon={Users}
                className="h-[110px]"
              />
              <StatCard
                title="Horses Assigned"
                value={`${drawStats.assigned} / 24`}
                subtitle="Total assignments"
                icon={Trophy}
                className="h-[110px]"
              />
              <StatCard
                title="Event Type"
                value={event.mode === 'sweep' ? 'Sweep' : 'Calcutta'}
                subtitle="Competition format"
                icon={Calendar}
                className="h-[110px]"
              />
            </div>

            {/* Draw Controls */}
            <div className="bg-[#f8f7f4] rounded-[20px] p-6 mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Draw Progress</h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <span className="text-slate-900 font-medium">{drawStats.progressPercentage}%</span>
                </div>
                <GradientProgressBar percentage={drawStats.progressPercentage} />
              </div>

              <div className="flex items-center justify-between text-sm mb-6">
                <span className="text-slate-600">
                  {drawStats.assigned} of 24 horses assigned
                </span>
                <span className="text-slate-900 font-medium">
                  {drawStats.waiting} participants waiting
                </span>
              </div>

              {/* All Assigned Message */}
              {allAssigned && (
                <div className="bg-green-50 border border-green-200 rounded-[20px] p-6 text-center mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-green-900 mb-1">All participants assigned!</h3>
                  <p className="text-green-700">Every participant has been assigned a horse. The draw is complete.</p>
                </div>
              )}

              {/* Action Cards */}
              {!allAssigned && (
                <div className="grid grid-cols-2 gap-6">
                  <ActionCard
                    title="Draw Next"
                    description="Draw a random horse for the next waiting participant"
                    bulletPoints={[
                      "Perfect for building suspense during your event",
                      "Results appear live on the QR code display",
                      "Creates an exciting reveal moment"
                    ]}
                    buttonText={isDrawing ? "Drawing..." : "Draw Next Participant"}
                    buttonIcon={Shuffle}
                    onButtonClick={handleDrawNext}
                    disabled={isDrawing || drawStats.waiting === 0}
                    buttonVariant="primary"
                  />

                  <ActionCard
                    title="Draw All"
                    description="Instantly assign all remaining participants to horses"
                    bulletPoints={[
                      "Fast and convenient for quick setup",
                      "Participants can check results via QR code",
                      "Great for online or async sweeps"
                    ]}
                    buttonText={isDrawing ? "Drawing..." : "Draw All Remaining"}
                    buttonIcon={Zap}
                    onButtonClick={handleDrawAll}
                    disabled={isDrawing || drawStats.waiting === 0}
                    buttonVariant="secondary"
                  />
                </div>
              )}
            </div>

            {/* Two-column layout */}
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
        )

      case 1: // QR Code Display
        return (
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">QR Code Display</h2>
            <p className="text-slate-600">QR code display functionality will be implemented here.</p>
          </div>
        )

      case 2: // Analytics
        return (
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Analytics</h2>
            <p className="text-slate-600">Event analytics and insights will be displayed here.</p>
          </div>
        )

      case 3: // Race Results
        return (
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Race Results</h2>
            <div className="space-y-4">
              <p className="text-slate-600">
                Results will be added automatically once the race has been confirmed. Winners will be notified immediately.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Race results are managed centrally and updated across all events in real-time.
                </p>
              </div>
            </div>
          </div>
        )

      case 4: // Live View
        return (
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Live View</h2>
            <p className="text-slate-600">Live view settings and controls will be available here.</p>
          </div>
        )

      case 5: // Export Data
        return (
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Export Data</h2>
            <p className="text-slate-600">Data export options will be implemented here.</p>
          </div>
        )

      case 6: // Settings
        return (
          <div className="bg-white border border-gray-200/50 rounded-[20px] p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Event Settings</h2>
            <p className="text-slate-600">Event configuration and settings will be available here.</p>
          </div>
        )

      default:
        return null
    }
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

        {/* Tab Menu */}
        <TabMenu activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab Content */}
        {renderTabContent()}
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