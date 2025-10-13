'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { toast } from 'sonner'
import {
  CheckCircle,
  Clock,
  Trophy,
  Shuffle,
  Zap
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

function GradientProgressBar({ percentage, className }: { percentage: number, className?: string }) {
  return (
    <div className={`bg-[#f8f7f4] rounded-full h-3 overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-full transition-all duration-300"
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

function DrawControlsContent() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        .order('created_at', { ascending: true })

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

      // Transform the data
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

  async function handleDrawNext() {
    if (isDrawing || drawStats.waiting === 0 || drawStats.availableHorses === 0) return

    try {
      setIsDrawing(true)

      // Call the draw-next API
      const response = await fetch(`/api/events/${eventId}/draw-next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to draw next participant')
      }

      if (data.success && data.assignment) {
        // Show success toast notification
        const participantName = data.assignment.participant.name
        const horseNumber = data.assignment.horse.number
        const horseName = data.assignment.horse.name

        toast.success(`${participantName} drew Horse #${horseNumber} - ${horseName}`, {
          duration: 2000,
        })
      }

      // Refresh data
      await fetchEventData()

    } catch (err) {
      console.error('Error drawing next participant:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to draw next participant', {
        duration: 3000,
      })
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
      // TODO: Add proper toast notification
      console.log(`🎉 Successfully assigned ${assignments.length} horses!`)

      // Refresh data
      await fetchEventData()

    } catch (err) {
      console.error('Error drawing all participants:', err)
      // TODO: Add proper error toast
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
            <p className="mt-2 text-gray-600">Loading draw controls...</p>
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

  const allAssigned = drawStats.waiting === 0

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Draw Controls</h1>
          <p className="text-slate-600">Manage your Melbourne Cup sweep draw</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6">
          <StatCard
            title="Assigned"
            value={drawStats.assigned}
            subtitle="Participants with horses"
            icon={CheckCircle}
            className="h-[110px]"
          />
          <StatCard
            title="Waiting"
            value={drawStats.waiting}
            subtitle="Participants waiting"
            icon={Clock}
            className="h-[110px]"
          />
          <StatCard
            title="Available Horses"
            value={drawStats.availableHorses}
            subtitle="Horses remaining"
            icon={Trophy}
            className="h-[110px]"
          />
        </div>

        {/* Progress Section */}
        <div className="bg-white border border-gray-200/50 rounded-[20px] p-8 space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Draw Progress</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Progress</span>
              <span className="text-slate-900 font-medium">{drawStats.progressPercentage}%</span>
            </div>
            <GradientProgressBar percentage={drawStats.progressPercentage} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {drawStats.assigned} of 24 horses assigned
            </span>
            <span className="text-slate-900 font-medium">
              {drawStats.waiting} participants waiting
            </span>
          </div>
        </div>

        {/* All Assigned Message */}
        {allAssigned && (
          <div className="bg-green-50 border border-green-200 rounded-[20px] p-6 text-center">
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
    </DashboardLayout>
  )
}

export default function DrawControlsPage() {
  return <DrawControlsContent />
}