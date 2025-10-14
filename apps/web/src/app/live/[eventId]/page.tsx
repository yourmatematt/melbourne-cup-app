'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Clock, Users, DollarSign, Star, Crown } from 'lucide-react'
import { MELBOURNE_CUP_2025_DATE } from '@/lib/melbourne-cup-data'

interface Event {
  id: string
  name: string
  event_date: string
  entry_fee: number
  event_type: 'sweep' | 'calcutta'
  max_participants: number
  status: 'draft' | 'active' | 'completed'
  first_place_percentage: number
  second_place_percentage: number
  third_place_percentage: number
}

interface Participant {
  id: string
  name: string
  horse_number?: number
  horse_name?: string
  bid_amount?: number
  draw_position?: number
  payment_status: 'pending' | 'paid' | 'expired'
  created_at: string
}

interface ActivityEntry {
  id: string
  participantName: string
  action: string
  timestamp: Date
  status: 'unpaid' | 'paid'
}

interface RaceResult {
  position: number
  horse_number: number
  horse_name: string
  jockey: string
  odds: string
  margin?: string
}

export default function LiveViewPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [raceResults, setRaceResults] = useState<RaceResult[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([])
  const [previousParticipants, setPreviousParticipants] = useState<Participant[]>([])
  const supabase = createClient()

 useEffect(() => {
    if (!eventId) return

    const fetchEventData = async () => {
      try {
        console.log('🔄 Fetching event data for:', eventId)

        // Fetch event details with prize percentages
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*, first_place_percentage, second_place_percentage, third_place_percentage')
          .eq('id', eventId)
          .single()

        if (eventError) throw eventError
        setEvent(eventData)
        console.log('📊 Event data loaded:', eventData.name)

        // Fetch REAL participants with payment status
        const { data: participantsData, error: participantsError } = await supabase
          .from('patron_entries')
          .select(`
            id,
            participant_name,
            payment_status,
            created_at
          `)
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })

        if (participantsError) throw participantsError
        console.log('👥 Participants data loaded:', participantsData?.length || 0, 'participants')

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

        if (assignmentsError) console.warn('Could not fetch assignments:', assignmentsError)

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
            name: p.participant_name,
            horse_number: assignment?.horse_number,
            horse_name: assignment?.horse_name,
            draw_position: null,
            payment_status: p.payment_status || 'pending',
            created_at: p.created_at
          }
        })

        // Generate activity entries for new/changed participants
        const generateActivity = (newParticipants: Participant[], oldParticipants: Participant[]) => {
          const activities: ActivityEntry[] = []

          // Check for new participants
          newParticipants.forEach(newP => {
            const existingP = oldParticipants.find(oldP => oldP.id === newP.id)
            if (!existingP) {
              // New participant joined - no horse info in ACTIVE status
              activities.push({
                id: `${newP.id}-joined`,
                participantName: newP.name,
                action: newP.payment_status === 'paid' ? 'Joined & Paid' : 'Joined - Not Paid',
                timestamp: new Date(newP.created_at),
                status: newP.payment_status === 'paid' ? 'paid' : 'unpaid'
              })
            } else if (existingP.payment_status !== newP.payment_status && newP.payment_status === 'paid') {
              // Payment status changed to paid
              activities.push({
                id: `${newP.id}-paid`,
                participantName: newP.name,
                action: 'Paid',
                timestamp: new Date(),
                status: 'paid'
              })
            }
          })

          return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)
        }

        // Update activity only if participants changed
        if (previousParticipants.length > 0) {
          const newActivities = generateActivity(transformedParticipants, previousParticipants)
          if (newActivities.length > 0) {
            console.log('📢 New activities generated:', newActivities.length)
            setRecentActivity(prev => [...newActivities, ...prev].slice(0, 5))
          }
        } else {
          // First load - show initial participants as activities
          const initialActivities = transformedParticipants.map(p => ({
            id: `${p.id}-initial`,
            participantName: p.name,
            action: p.payment_status === 'paid' ? 'Joined & Paid' : 'Joined - Not Paid',
            timestamp: new Date(p.created_at),
            status: p.payment_status === 'paid' ? 'paid' as const : 'unpaid' as const
          })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)
          setRecentActivity(initialActivities)
        }

        setPreviousParticipants(transformedParticipants)
        setParticipants(transformedParticipants)
        console.log('✅ Data update complete')
        console.log('👥 Updated participants:', transformedParticipants.map(p => `${p.name} (${p.payment_status})`).join(', '))

      } catch (error) {
        console.error('❌ Error fetching event data:', error)
      } finally {
        setLoading(false)
      }
    }

    // Initial data fetch
    fetchEventData()

    // Set up real-time subscription
    console.log('🔗 Setting up real-time subscription for event:', eventId)
    const channel = supabase
      .channel(`event-${eventId}-live`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patron_entries',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('🔔 Patron entry changed:', payload)
          console.log('Event type:', payload.eventType)
          console.log('Table:', payload.table)
          fetchEventData() // THIS MUST BE CALLED
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('🔔 Assignment changed:', payload)
          console.log('Event type:', payload.eventType)
          fetchEventData() // THIS MUST BE CALLED
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
      })

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up subscription')
      clearInterval(timeInterval)
      supabase.removeChannel(channel)
    }
  }, [eventId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-white text-[24px] font-['Arial:Regular',_sans-serif]">
          Loading Live View...
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-[36px] font-['Arial:Bold',_sans-serif] font-bold mb-4">
            Event Not Found
          </h1>
          <p className="text-[20px] font-['Arial:Regular',_sans-serif]">
            The live view for this event is not available.
          </p>
        </div>
      </div>
    )
  }

  const getEventState = () => {
    const now = new Date()
    const eventDate = new Date(event.event_date)
    const melbourneCupDate = new Date(MELBOURNE_CUP_2025_DATE)

    if (now < eventDate) return 'pre-event'
    if (now < melbourneCupDate || event.status === 'active') return 'during-event'
    return 'post-event'
  }

  const eventState = getEventState()

  const renderPreEventView = () => (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-12 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-[48px] leading-[56px] font-['Arial:Bold',_sans-serif] font-bold bg-gradient-to-r from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] bg-clip-text text-transparent">
                {event.name}
              </h1>
              <p className="text-[24px] font-['Arial:Regular',_sans-serif] text-white/80 mt-2">
                {event.event_type === 'sweep' ? 'Melbourne Cup Sweep' : 'Melbourne Cup Calcutta'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[20px] font-['Arial:Regular',_sans-serif] text-white/60 mb-2">
                Current Time
              </div>
              <div className="text-[32px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                {currentTime.toLocaleTimeString('en-AU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Event Info Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-8 border border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#ff8a00] to-[#ff4d8d] rounded-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-[28px] font-['Arial:Bold',_sans-serif] font-bold">Event Details</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-[18px] font-['Arial:Regular',_sans-serif] text-white/80">Event Date</span>
                <span className="text-[18px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                  {new Date(event.event_date).toLocaleDateString('en-AU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-[18px] font-['Arial:Regular',_sans-serif] text-white/80">Entry Fee</span>
                <span className="text-[18px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                  ${event.entry_fee.toFixed(2)} AUD
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-[18px] font-['Arial:Regular',_sans-serif] text-white/80">Event Progress</span>
                <span className="text-[18px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                  {event.max_participants - participants.length} / {event.max_participants} Spots Remaining in Sweep
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-[18px] font-['Arial:Regular',_sans-serif] text-white/80">Prize Pool</span>
                <span className="text-[18px] font-['Arial:Bold',_sans-serif] font-bold text-green-400">
                  {event.entry_fee === 0 ? 'Free Event' : (() => {
                    const paidParticipants = participants.filter(p => p.payment_status === 'paid')
                    const totalPool = paidParticipants.length * event.entry_fee
                    return `$${totalPool.toFixed(2)} AUD`
                  })()}
                </span>
              </div>
              {event.entry_fee > 0 && (() => {
                const paidParticipants = participants.filter(p => p.payment_status === 'paid')
                const totalPool = paidParticipants.length * event.entry_fee
                const firstPrize = totalPool * (event.first_place_percentage / 100)
                const secondPrize = totalPool * (event.second_place_percentage / 100)
                const thirdPrize = totalPool * (event.third_place_percentage / 100)

                return (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-[14px] font-['Arial:Regular',_sans-serif] text-white/60">
                      <span>1st Place ({event.first_place_percentage}%)</span>
                      <span>${firstPrize.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[14px] font-['Arial:Regular',_sans-serif] text-white/60">
                      <span>2nd Place ({event.second_place_percentage}%)</span>
                      <span>${secondPrize.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[14px] font-['Arial:Regular',_sans-serif] text-white/60">
                      <span>3rd Place ({event.third_place_percentage}%)</span>
                      <span>${thirdPrize.toFixed(2)}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Countdown Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-8 border border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#ff4d8d] to-[#8b5cf6] rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-[28px] font-['Arial:Bold',_sans-serif] font-bold">Race Countdown</h3>
            </div>

            <div className="text-center">
              <CountdownTimer targetDate={MELBOURNE_CUP_2025_DATE} />
              <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-white/60 mt-4">
                Until the Melbourne Cup 2025
              </p>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-8 border border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#8b5cf6] to-[#ff8a00] rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-[28px] font-['Arial:Bold',_sans-serif] font-bold">Event Status</h3>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-yellow-500/20 border border-yellow-400/40 mb-4">
                <span className="text-[20px] font-['Arial:Bold',_sans-serif] font-bold text-yellow-400">
                  Waiting for Race Day
                </span>
              </div>
              <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-white/80">
                All participants are ready! The draw will be conducted closer to race day.
              </p>
            </div>
          </div>
        </div>

        {/* Participants Grid */}
        <div className="mt-12">
          <h2 className="text-[36px] font-['Arial:Bold',_sans-serif] font-bold text-center mb-8">
            Event Participants
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {participants.map((participant, index) => (
              <div key={participant.id} className="bg-white/10 backdrop-blur-sm rounded-[16px] p-4 border border-white/20 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#ff8a00] to-[#ff4d8d] rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-[18px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <h4 className="text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-white mb-1">
                  {participant.name}
                </h4>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-['Arial:Bold',_sans-serif] font-bold ${
                  participant.payment_status === 'paid'
                    ? 'bg-green-500/20 border border-green-400/40 text-green-400'
                    : 'bg-orange-500/20 border border-orange-400/40 text-orange-400'
                }`}>
                  {participant.payment_status === 'paid' ? 'Paid' : 'Not Paid'}
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: event.max_participants - participants.length }).map((_, index) => (
              <div key={`empty-${index}`} className="bg-white/5 backdrop-blur-sm rounded-[16px] p-4 border border-white/10 border-dashed text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-[18px] font-['Arial:Regular',_sans-serif] text-white/40">
                    {participants.length + index + 1}
                  </span>
                </div>
                <p className="text-[12px] font-['Arial:Regular',_sans-serif] text-white/40">
                  Available
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity for Active Events */}
        {event.status === 'active' && (
          <div className="mt-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-6 border border-white/20">
              <h3 className="text-[24px] font-['Arial:Bold',_sans-serif] font-bold text-center mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-white/60 text-center">
                    No recent activity
                  </p>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-white/5 rounded-[12px] border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-[12px] font-['Arial:Bold',_sans-serif] font-bold ${
                          activity.status === 'paid'
                            ? 'bg-green-500/20 border border-green-400/40 text-green-400'
                            : 'bg-orange-500/20 border border-orange-400/40 text-orange-400'
                        }`}>
                          {activity.status === 'paid' ? '✓' : '○'}
                        </div>
                        <span className="text-[16px] font-['Arial:Regular',_sans-serif] text-white">
                          <span className="font-['Arial:Bold',_sans-serif] font-bold">[{activity.participantName}]</span> - {activity.action}
                        </span>
                      </div>
                      <span className="text-[12px] font-['Arial:Regular',_sans-serif] text-white/60">
                        {activity.timestamp.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderDuringEventView = () => (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-12 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-[42px] leading-[48px] font-['Arial:Bold',_sans-serif] font-bold bg-gradient-to-r from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] bg-clip-text text-transparent">
                {event.name} - LIVE
              </h1>
              <p className="text-[20px] font-['Arial:Regular',_sans-serif] text-white/80">
                Melbourne Cup 2025 - Race in Progress
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-red-500/20 border border-red-400/40 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-red-400">
                  LIVE
                </span>
              </div>
              <div className="text-[24px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                {currentTime.toLocaleTimeString('en-AU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-12 py-8">
        {/* Race Progress */}
        <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-8 border border-white/20 mb-8">
          <h2 className="text-[32px] font-['Arial:Bold',_sans-serif] font-bold text-center mb-6">
            Race in Progress
          </h2>
          <div className="text-center">
            <div className="inline-block">
              <div className="w-32 h-32 bg-gradient-to-r from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Trophy className="w-16 h-16 text-white" />
              </div>
            </div>
            <p className="text-[20px] font-['Arial:Regular',_sans-serif] text-white/80">
              The Melbourne Cup is currently underway. Results will be available shortly.
            </p>
          </div>
        </div>

        {/* Horse Field with Participants */}
        <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-8 border border-white/20 mb-8">
          <h3 className="text-[28px] font-['Arial:Bold',_sans-serif] font-bold text-center mb-8">
            Your Horses in the Race
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {participants.map((participant) => (
              <div key={participant.id} className="bg-white/5 backdrop-blur-sm rounded-[16px] p-6 border border-white/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#ff8a00] to-[#ff4d8d] rounded-full flex items-center justify-center">
                    <span className="text-[18px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                      {participant.horse_number}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[18px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                      {participant.horse_name}
                    </h4>
                    <p className="text-[14px] font-['Arial:Regular',_sans-serif] text-white/60">
                      {participant.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40">
                    <span className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-blue-400">
                      Racing
                    </span>
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-[12px] font-['Arial:Bold',_sans-serif] font-bold ${
                    participant.payment_status === 'paid'
                      ? 'bg-green-500/20 border border-green-400/40 text-green-400'
                      : 'bg-orange-500/20 border border-orange-400/40 text-orange-400'
                  }`}>
                    {participant.payment_status === 'paid' ? 'Paid' : 'Not Paid'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Ticker */}
        <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-6 border border-white/20">
          <h3 className="text-[24px] font-['Arial:Bold',_sans-serif] font-bold text-center mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-white/60 text-center">
                No recent activity
              </p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-white/5 rounded-[12px] border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-[12px] font-['Arial:Bold',_sans-serif] font-bold ${
                      activity.status === 'paid'
                        ? 'bg-green-500/20 border border-green-400/40 text-green-400'
                        : 'bg-orange-500/20 border border-orange-400/40 text-orange-400'
                    }`}>
                      {activity.status === 'paid' ? '✓' : '○'}
                    </div>
                    <span className="text-[16px] font-['Arial:Regular',_sans-serif] text-white">
                      <span className="font-['Arial:Bold',_sans-serif] font-bold">[{activity.participantName}]</span> - {activity.action}
                    </span>
                  </div>
                  <span className="text-[12px] font-['Arial:Regular',_sans-serif] text-white/60">
                    {activity.timestamp.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderPostEventView = () => (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-12 py-6">
          <div className="text-center">
            <h1 className="text-[48px] leading-[56px] font-['Arial:Bold',_sans-serif] font-bold bg-gradient-to-r from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] bg-clip-text text-transparent mb-2">
              🏆 Melbourne Cup 2025 Results 🏆
            </h1>
            <p className="text-[24px] font-['Arial:Regular',_sans-serif] text-white/80">
              {event.name} - Final Results
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-12 py-8">
        {/* Winners Section */}
        <div className="mb-12">
          <h2 className="text-[36px] font-['Arial:Bold',_sans-serif] font-bold text-center mb-8">
            🎉 Congratulations to Our Winners! 🎉
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {raceResults.slice(0, 3).map((result, index) => {
              const participant = participants.find(p => p.horse_number === result.horse_number)
              const prizes = ['1st Place', '2nd Place', '3rd Place']
              const colors = [
                'from-yellow-400 to-yellow-600',
                'from-gray-300 to-gray-500',
                'from-orange-400 to-orange-600'
              ]
              const icons = [Crown, Star, Trophy]
              const Icon = icons[index]

              return (
                <div key={result.position} className="bg-white/10 backdrop-blur-sm rounded-[24px] p-8 border border-white/20 text-center">
                  <div className={`w-20 h-20 bg-gradient-to-br ${colors[index]} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-[24px] font-['Arial:Bold',_sans-serif] font-bold text-white mb-2">
                    {prizes[index]}
                  </h3>
                  <h4 className="text-[20px] font-['Arial:Bold',_sans-serif] font-bold text-white mb-1">
                    {participant?.name || 'Unknown Participant'}
                  </h4>
                  <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-white/80 mb-2">
                    Horse #{result.horse_number} - {result.horse_name}
                  </p>
                  <p className="text-[14px] font-['Arial:Regular',_sans-serif] text-white/60">
                    Jockey: {result.jockey} | Odds: {result.odds}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Full Race Results */}
        <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-8 border border-white/20 mb-8">
          <h3 className="text-[28px] font-['Arial:Bold',_sans-serif] font-bold text-center mb-6">
            Official Race Results
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4 text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-white">Position</th>
                  <th className="text-left py-4 px-4 text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-white">Horse</th>
                  <th className="text-left py-4 px-4 text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-white">Jockey</th>
                  <th className="text-left py-4 px-4 text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-white">Odds</th>
                  <th className="text-left py-4 px-4 text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-white">Margin</th>
                  <th className="text-left py-4 px-4 text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-white">Participant</th>
                </tr>
              </thead>
              <tbody>
                {raceResults.map((result) => {
                  const participant = participants.find(p => p.horse_number === result.horse_number)
                  return (
                    <tr key={result.position} className="border-b border-white/10">
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[14px] font-['Arial:Bold',_sans-serif] font-bold ${
                          result.position === 1 ? 'bg-yellow-500 text-black' :
                          result.position === 2 ? 'bg-gray-400 text-black' :
                          result.position === 3 ? 'bg-orange-500 text-white' :
                          'bg-white/20 text-white'
                        }`}>
                          {result.position}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-white">
                            #{result.horse_number} {result.horse_name}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[14px] font-['Arial:Regular',_sans-serif] text-white/80">
                        {result.jockey}
                      </td>
                      <td className="py-4 px-4 text-[14px] font-['Arial:Regular',_sans-serif] text-white/80">
                        {result.odds}
                      </td>
                      <td className="py-4 px-4 text-[14px] font-['Arial:Regular',_sans-serif] text-white/80">
                        {result.margin || '-'}
                      </td>
                      <td className="py-4 px-4">
                        {participant ? (
                          <span className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-green-400">
                            {participant.name}
                          </span>
                        ) : (
                          <span className="text-[14px] font-['Arial:Regular',_sans-serif] text-white/40">
                            Not in event
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prize Distribution */}
        <div className="bg-white/10 backdrop-blur-sm rounded-[24px] p-8 border border-white/20">
          <h3 className="text-[28px] font-['Arial:Bold',_sans-serif] font-bold text-center mb-6">
            Prize Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-[32px] font-['Arial:Bold',_sans-serif] font-bold text-yellow-400 mb-2">
                ${((participants.length * event.entry_fee) * 0.6).toFixed(2)}
              </div>
              <div className="text-[16px] font-['Arial:Regular',_sans-serif] text-white/80">
                1st Place Prize
              </div>
            </div>
            <div className="text-center">
              <div className="text-[32px] font-['Arial:Bold',_sans-serif] font-bold text-gray-400 mb-2">
                ${((participants.length * event.entry_fee) * 0.3).toFixed(2)}
              </div>
              <div className="text-[16px] font-['Arial:Regular',_sans-serif] text-white/80">
                2nd Place Prize
              </div>
            </div>
            <div className="text-center">
              <div className="text-[32px] font-['Arial:Bold',_sans-serif] font-bold text-orange-400 mb-2">
                ${((participants.length * event.entry_fee) * 0.1).toFixed(2)}
              </div>
              <div className="text-[16px] font-['Arial:Regular',_sans-serif] text-white/80">
                3rd Place Prize
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  switch (eventState) {
    case 'pre-event':
      return renderPreEventView()
    case 'during-event':
      return renderDuringEventView()
    case 'post-event':
      return renderPostEventView()
    default:
      return renderPreEventView()
  }
}

// Countdown Timer Component
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        })
      }
    }

    const timer = setInterval(calculateTimeLeft, 1000)
    calculateTimeLeft()

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className="grid grid-cols-4 gap-4">
      {Object.entries(timeLeft).map(([interval, value]) => (
        <div key={interval} className="text-center">
          <div className="text-[36px] font-['Arial:Bold',_sans-serif] font-bold text-white">
            {value.toString().padStart(2, '0')}
          </div>
          <div className="text-[14px] font-['Arial:Regular',_sans-serif] text-white/60 uppercase">
            {interval}
          </div>
        </div>
      ))}
    </div>
  )
}