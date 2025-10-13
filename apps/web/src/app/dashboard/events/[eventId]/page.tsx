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
  ChevronLeft,
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
  CheckCircle,
  MoreHorizontal,
  Copy,
  Printer,
  Share2,
  TrendingUp,
  Target,
  DollarSign,
  Activity,
  Medal,
  CheckCircle2,
  Podium,
  LayoutDashboard
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
  payment_status?: 'paid' | 'pending' | 'unpaid'
}

type DrawStats = {
  assigned: number
  waiting: number
  availableHorses: number
  progressPercentage: number
}

const TABS = [
  { id: 0, label: 'Overview', icon: LayoutDashboard },
  { id: 1, label: 'Event Control', icon: Play },
  { id: 2, label: 'QR & Links', icon: QrCode },
  { id: 3, label: 'Analytics', icon: BarChart3 },
  { id: 4, label: 'Race Results', icon: Trophy },
  { id: 5, label: 'Event Settings', icon: Settings }
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

function ParticipantRow({ participant, onPaymentToggle }: {
  participant: Participant
  onPaymentToggle?: (participantId: string, newStatus: 'paid' | 'unpaid') => void
}) {
  const initials = getInitials(participant.participant_name)
  const isPaid = participant.payment_status === 'paid'

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[20px] p-5 flex items-center gap-4 hover:shadow-sm transition-all duration-200">
      {/* Left side - Avatar and Info */}
      <div className="flex items-center gap-4 flex-1">
        <div className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full w-12 h-12 flex items-center justify-center shadow-sm">
          <span className="text-white text-sm font-semibold">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-slate-900 truncate leading-tight">
            {participant.participant_name}
          </p>
          <p className="text-sm text-slate-500 truncate mt-0.5">
            {participant.email}
          </p>
        </div>
      </div>

      {/* Right side - Horse Badge and Payment Toggle */}
      <div className="flex items-center gap-4">
        {/* Horse Badge */}
        {participant.horse_number ? (
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-full px-4 py-2 shadow-sm">
            <span className="text-sm font-bold text-violet-700 uppercase tracking-wide">
              Horse #{participant.horse_number}
            </span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-full px-4 py-2 shadow-sm">
            <span className="text-sm font-bold text-orange-600 uppercase tracking-wide">
              Waiting
            </span>
          </div>
        )}

        {/* Payment Toggle */}
        <button
          onClick={() => onPaymentToggle?.(participant.id, isPaid ? 'unpaid' : 'paid')}
          className={`w-12 h-6 rounded-full border-2 transition-all relative shadow-sm ${
            isPaid
              ? 'bg-emerald-500 border-emerald-500'
              : 'bg-slate-200 border-slate-300 hover:border-slate-400'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform absolute top-0.5 ${
              isPaid ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
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
      className={`w-full aspect-square rounded-[16px] border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 ${
        isAssigned
          ? 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300 text-violet-700 shadow-sm hover:shadow-md'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      #{number}
    </button>
  )
}

function TabMenu({ activeTab, setActiveTab }: { activeTab: number, setActiveTab: (tab: number) => void }) {
  return (
    <div className="bg-[#F8F7F4] border border-black/8 rounded-[16px] p-1.5 inline-flex w-[615px] h-[46px]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded-[12px] text-sm font-medium transition-all flex-1 ${
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
            number,
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
            horse_number: assignment.event_horses.number,
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
          horse_name: assignment?.horse_name,
          payment_status: 'unpaid' as 'paid' | 'pending' | 'unpaid' // TODO: Fetch from database
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

  async function handlePaymentToggle(participantId: string, newStatus: 'paid' | 'unpaid') {
    try {
      // Update local state immediately for responsive UI
      setParticipants(prevParticipants =>
        prevParticipants.map(p =>
          p.id === participantId ? { ...p, payment_status: newStatus } : p
        )
      )

      // TODO: Update payment status in database
      console.log(`Payment status for ${participantId} changed to ${newStatus}`)
    } catch (err) {
      console.error('Error updating payment status:', err)
      // Revert local state on error
      await fetchEventData()
    }
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
        .eq('number', randomHorse)
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
        .select('id, number, name')
        .eq('event_id', eventId)
        .in('number', shuffledHorses.slice(0, waitingParticipants.length))

      if (horsesError) throw horsesError

      // Create horse number to ID mapping
      const horseMap = new Map()
      horsesData.forEach(horse => {
        horseMap.set(horse.number, horse.id)
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
      case 0: // Overview
        return (
          <div className="space-y-8">
            {/* Stats Cards - Figma Design */}
            <div className="grid grid-cols-3 gap-6">
              <StatCard
                title="Participants"
                value={`${participants.length} / ${event.capacity}`}
                subtitle="Current registrations"
                icon={Users}
                className="h-[134px]"
              />
              <StatCard
                title="Horses Assigned"
                value={`${drawStats.assigned} / 24`}
                subtitle="Total assignments"
                icon={Trophy}
                className="h-[134px]"
              />
              <StatCard
                title="Payment Status"
                value={`${Math.round((participants.length / event.capacity) * 100)}%`}
                subtitle="Payments received"
                icon={CheckCircle}
                className="h-[134px]"
              />
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
                      <ParticipantRow
                        key={participant.id}
                        participant={participant}
                        onPaymentToggle={handlePaymentToggle}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">No Participants Yet</h4>
                      <p className="text-sm text-slate-600 text-center mb-6 max-w-xs">
                        Get started by sharing your event QR code or join link with participants
                      </p>
                      <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button className="bg-gradient-to-r from-[#ff6b35] to-[#a855f7] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                          <QrCode className="h-4 w-4" />
                          Print QR Code
                        </button>
                        <button
                          onClick={() => setShowAddParticipantModal(true)}
                          className="bg-[#f8f7f4] border border-gray-200 text-slate-900 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Share2 className="h-4 w-4" />
                          Share Join Link
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 text-center mt-4">
                        Participants can also join by scanning the QR code
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Horse Field Column */}
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Horse Field</h3>
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">24 runners</span>
                </div>

                <div className="grid grid-cols-6 gap-3">
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

      case 1: // Event Control
        return (
          <div className="space-y-8">
            {/* Draw Controls - Only show when participants exist */}
            {participants.length > 0 ? (
              <div className="bg-[#f8f7f4] rounded-[20px] p-6">
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
            ) : (
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No participants to draw</h3>
                <p className="text-slate-600 mb-4">Add participants first to start drawing horses</p>
                <button
                  onClick={() => setShowAddParticipantModal(true)}
                  className="bg-gradient-to-r from-[#ff6b35] to-[#a855f7] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Add Participant
                </button>
              </div>
            )}
          </div>
        )

      case 2: // QR & Links
        return (
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Participant Signup QR Code */}
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-8">
              <h3 className="text-base text-slate-900 mb-6">
                Participant Signup QR Code
              </h3>

              <div className="flex flex-col items-center gap-4 mb-6">
                {/* QR Code Placeholder */}
                <div className="bg-[rgba(248,247,244,0.3)] rounded-[16px] w-[250px] h-[250px] flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-slate-400" />
                </div>

                {/* URL Display */}
                <div className="bg-[rgba(248,247,244,0.3)] rounded-[12px] p-4 w-full">
                  <p className="font-mono text-sm text-slate-900">
                    https://app.melbournecupsweep.com.au/events/{eventId}/join
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  <button className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-100 transition-colors">
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-100 transition-colors">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-100 transition-colors">
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-600 text-center">
                Display this QR code at your venue for easy participant signup
              </p>
            </div>

            {/* Right Column - Live View TV Display */}
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-8">
              <h3 className="text-base text-slate-900 mb-4">
                Display Live View on Your TV
              </h3>

              <div className="space-y-4 mb-6">
                <p className="text-sm text-slate-600">
                  Enter this URL on your TV:
                </p>

                {/* TV URL Display */}
                <div className="bg-[#ffebe6] border border-[rgba(0,0,0,0.08)] rounded-[12px] p-4 flex items-center justify-between">
                  <p className="font-mono font-bold text-base text-slate-900">
                    sweep.app/live/{eventId}
                  </p>
                  <button className="w-5 h-5 text-slate-600">
                    <Download className="w-full h-full" />
                  </button>
                </div>

                <div className="text-center py-4">
                  <p className="text-sm text-slate-600 mb-4">
                    Or scan with your TV remote:
                  </p>

                  {/* TV QR Code */}
                  <div className="bg-[rgba(248,247,244,0.3)] rounded-[12px] w-[150px] h-[150px] mx-auto flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  How to use:
                </h4>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  <li>• Type the URL into your TV browser or smart device</li>
                  <li>• Display will update automatically during the race</li>
                  <li>• Perfect for projection at your venue</li>
                </ul>
              </div>
            </div>
          </div>
        )

      case 3: // Analytics
        return (
          <div className="space-y-6">
            {/* Analytics Header */}
            <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Event Analytics</h2>
              <p className="text-slate-600">Track your event performance and participant engagement</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Registration Rate"
                value={`${Math.round((participants.length / event.capacity) * 100)}%`}
                subtitle={`${participants.length} of ${event.capacity} spots`}
                icon={Target}
                className="h-[120px]"
              />
              <StatCard
                title="Payment Rate"
                value={`${Math.round((participants.filter(p => p.payment_status === 'paid').length / Math.max(participants.length, 1)) * 100)}%`}
                subtitle={`${participants.filter(p => p.payment_status === 'paid').length} paid participants`}
                icon={DollarSign}
                className="h-[120px]"
              />
              <StatCard
                title="Draw Progress"
                value={`${Math.round(drawStats.progressPercentage)}%`}
                subtitle={`${drawStats.assigned} horses assigned`}
                icon={Activity}
                className="h-[120px]"
              />
              <StatCard
                title="Engagement"
                value="High"
                subtitle="Active participation"
                icon={TrendingUp}
                className="h-[120px]"
              />
            </div>

            {/* Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registration Timeline */}
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Registration Timeline</h3>
                <div className="h-48 bg-[rgba(248,247,244,0.3)] rounded-[12px] flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Registration timeline chart</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>Peak time: 2:00 PM - 4:00 PM</span>
                  <span>{participants.length} total registrations</span>
                </div>
              </div>

              {/* Payment Status Breakdown */}
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Payment Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm text-slate-900">Paid</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {participants.filter(p => p.payment_status === 'paid').length}
                      </span>
                      <span className="text-xs text-slate-600 ml-1">participants</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-slate-900">Pending</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {participants.filter(p => p.payment_status === 'unpaid').length}
                      </span>
                      <span className="text-xs text-slate-600 ml-1">participants</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                      <span className="text-sm text-slate-900">Available Spots</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {event.capacity - participants.length}
                      </span>
                      <span className="text-xs text-slate-600 ml-1">remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Performance Summary */}
            <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Registration Success</h4>
                  <p className="text-sm text-slate-600">
                    {Math.round((participants.length / event.capacity) * 100)}% capacity filled
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Revenue Generated</h4>
                  <p className="text-sm text-slate-600">
                    ${participants.filter(p => p.payment_status === 'paid').length * 20} collected
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Event Status</h4>
                  <p className="text-sm text-slate-600">
                    {event.status === 'active' ? 'Running smoothly' : `Status: ${event.status}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 4: // Race Results
        return (
          <div className="space-y-6">
            {/* Race Results Header */}
            <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Race Results</h2>
                  <p className="text-slate-600">Manage race outcomes and winner payouts</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill
                    label={event.status === 'completed' ? 'Results Final' : 'Pending Results'}
                    variant={event.status === 'completed' ? 'completed' : 'draft'}
                    icon={event.status === 'completed' ? CheckCircle2 : Clock}
                  />
                </div>
              </div>
            </div>

            {event.status !== 'completed' ? (
              /* Pre-Race State */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Race Status */}
                <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Race Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Race Date</span>
                      <span className="text-sm font-medium text-slate-900">
                        {new Date(event.starts_at).toLocaleDateString('en-AU', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Race Time</span>
                      <span className="text-sm font-medium text-slate-900">
                        {new Date(event.starts_at).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total Prize Pool</span>
                      <span className="text-sm font-medium text-slate-900">
                        ${participants.filter(p => p.payment_status === 'paid').length * 20}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Participants</span>
                      <span className="text-sm font-medium text-slate-900">
                        {participants.length} registered
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prize Breakdown */}
                <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Prize Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium text-slate-900">1st Place</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-700">
                        ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-slate-900">2nd Place</span>
                      </div>
                      <span className="text-sm font-bold text-gray-600">
                        ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.3)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-orange-500" />
                        <span className="text-sm font-medium text-slate-900">3rd Place</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600">
                        ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Post-Race Results State */
              <div className="space-y-6">
                {/* Winners Podium */}
                <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 text-center">🏆 Race Winners</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1st Place */}
                    <div className="text-center p-6 bg-gradient-to-b from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-[16px]">
                      <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">1st Place</h4>
                      <p className="text-sm text-slate-600 mb-2">Horse #3 - Exemplar</p>
                      <p className="text-sm font-medium text-slate-900">Sarah Johnson</p>
                      <p className="text-lg font-bold text-yellow-700 mt-2">
                        ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.6)}
                      </p>
                    </div>

                    {/* 2nd Place */}
                    <div className="text-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-gray-300 rounded-[16px]">
                      <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Medal className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">2nd Place</h4>
                      <p className="text-sm text-slate-600 mb-2">Horse #12 - Knight's Choice</p>
                      <p className="text-sm font-medium text-slate-900">Michael Chen</p>
                      <p className="text-lg font-bold text-gray-700 mt-2">
                        ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.3)}
                      </p>
                    </div>

                    {/* 3rd Place */}
                    <div className="text-center p-6 bg-gradient-to-b from-orange-50 to-orange-100 border-2 border-orange-300 rounded-[16px]">
                      <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Medal className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">3rd Place</h4>
                      <p className="text-sm text-slate-600 mb-2">Horse #7 - Onesmoothoperator</p>
                      <p className="text-sm font-medium text-slate-900">David Wilson</p>
                      <p className="text-lg font-bold text-orange-700 mt-2">
                        ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.1)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Results Table */}
                <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Complete Race Results</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Position</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Horse</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Participant</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Prize</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-2 text-sm font-bold text-yellow-600">1st</td>
                          <td className="py-3 px-2 text-sm text-slate-900">#3 Exemplar</td>
                          <td className="py-3 px-2 text-sm text-slate-900">Sarah Johnson</td>
                          <td className="py-3 px-2 text-sm font-bold text-right text-yellow-600">
                            ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.6)}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-2 text-sm font-bold text-gray-600">2nd</td>
                          <td className="py-3 px-2 text-sm text-slate-900">#12 Knight's Choice</td>
                          <td className="py-3 px-2 text-sm text-slate-900">Michael Chen</td>
                          <td className="py-3 px-2 text-sm font-bold text-right text-gray-600">
                            ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.3)}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-2 text-sm font-bold text-orange-600">3rd</td>
                          <td className="py-3 px-2 text-sm text-slate-900">#7 Onesmoothoperator</td>
                          <td className="py-3 px-2 text-sm text-slate-900">David Wilson</td>
                          <td className="py-3 px-2 text-sm font-bold text-right text-orange-600">
                            ${Math.round(participants.filter(p => p.payment_status === 'paid').length * 20 * 0.1)}
                          </td>
                        </tr>
                        {participants.slice(3).map((participant, index) => (
                          <tr key={participant.id} className="border-b border-gray-50">
                            <td className="py-3 px-2 text-sm text-slate-500">{index + 4}th</td>
                            <td className="py-3 px-2 text-sm text-slate-700">
                              {participant.horse_number ? `#${participant.horse_number}` : 'No horse'}
                            </td>
                            <td className="py-3 px-2 text-sm text-slate-700">{participant.participant_name}</td>
                            <td className="py-3 px-2 text-sm text-right text-slate-500">$0</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Race Results Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Automatic Results Integration</h4>
                  <p className="text-sm text-blue-800">
                    Race results are automatically updated from official Melbourne Cup sources.
                    Winners are notified immediately via email and SMS when results are confirmed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 5: // Event Settings
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
        {/* Event Header - Figma Design */}
        <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 h-[76px] flex items-center justify-between">
          {/* Left Section - Back Button + Title + Status + Date */}
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Link href="/dashboard">
              <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
            </Link>

            {/* Title */}
            <h1 className="text-[32px] font-normal text-slate-900">
              {event.name}
            </h1>

            {/* Status Badge */}
            <div className="bg-[#8B5CF6] text-white px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">
                {event.status.toUpperCase()}
              </span>
            </div>

            {/* Date/Time */}
            <span className="text-slate-600 text-sm">
              {new Date(event.starts_at).toLocaleDateString('en-AU', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="flex items-center gap-3">
            <button className="bg-[#f8f7f4] border border-gray-200 h-9 px-4 rounded-xl flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="bg-[#f8f7f4] border border-gray-200 h-9 px-4 rounded-xl flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-50 transition-colors">
              <MoreHorizontal className="h-4 w-4" />
              More
            </button>
          </div>
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