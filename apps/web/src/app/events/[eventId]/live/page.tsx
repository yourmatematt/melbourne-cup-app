'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeSVG } from 'qrcode.react'
import {
  Calendar,
  Users,
  Trophy,
  Crown,
  MapPin,
  Clock,
  Loader2,
  RefreshCw,
  Medal,
  Award,
  Zap,
  Radio,
  Wifi,
  Activity,
  QrCode,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRealtimeAssignments } from '@/hooks/use-realtime-assignments'
import { useRealtimeParticipants } from '@/hooks/use-realtime-participants'
import ErrorBoundary from '@/components/error-boundary'
import { ClientDebugBanner } from '@/components/debug/client-debug-banner'
import { motion, AnimatePresence } from 'framer-motion'

// TV-optimized text shadows for better readability
const tvOptimizedStyles = `
  .text-shadow-tv {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5);
  }
  .text-shadow-strong {
    text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
  }
`

interface Event {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  participant_count?: number
  entry_fee?: number
  first_place_percentage?: number
  second_place_percentage?: number
  third_place_percentage?: number
  tenant: {
    name: string
  }
}

interface Assignment {
  id: string
  patron_entry_id: string
  event_horse_id: string
  created_at: string
  patron_entries?: {
    participant_name: string
  }
  event_horses?: {
    number: number
    name: string
    jockey?: string
  }
}

interface RecentAssignment {
  id: string
  participant_name: string
  horse_number: number
  horse_name: string
  jockey?: string
  created_at: string
  isNew?: boolean
}

interface Horse {
  id: string
  number: number
  name: string
  jockey?: string
  is_scratched: boolean
}

interface ParticipantStatus {
  id: string
  participant_name: string
  horse_number?: number
  horse_name?: string
  has_paid: boolean
  payment_status?: 'pending' | 'paid' | 'expired'
  assigned_at?: string
  created_at?: string
}

interface Result {
  id: string
  place: number
  event_horse_id: string | null
  patron_entry_id: string | null
  prize_amount: number | null
  collected: boolean
  collected_at: string | null
  patron_entries: {
    participant_name: string
  } | null
  event_horses: {
    number: number
    name: string
  } | null
}

function LiveViewPage() {
  console.log('[COMPONENT] LIVE PAGE COMPONENT MOUNTING - LiveViewPage function called')

  // Simple debug state
  const [debugMode, setDebugMode] = useState(false)
  const [componentError, setComponentError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Get params safely
  const params = useParams()
  const eventId = params.eventId as string
  console.log('[PARAMS] LIVE PAGE - eventId from params:', eventId, 'params:', params)
  const supabase = useMemo(() => createClient(), [])

  // Client-side only initialization
  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('[CLIENT] LiveViewPage mounted on client')
    setMounted(true)
    setDebugMode(true)

    // Set join URL for QR code
    setJoinUrl(`${window.location.origin}/events/${eventId}/enter`)
  }, [eventId])

  useEffect(() => {
    if (mounted) {
      console.log('[MOUNT] Component fully mounted', { eventId, supabaseReady: !!supabase })
    }
  }, [mounted, eventId])

  const [event, setEvent] = useState<Event | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [horses, setHorses] = useState<Horse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([])
  const [newAssignmentId, setNewAssignmentId] = useState<string | null>(null)
  const [pollingActive, setPollingActive] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [realtimeFlash, setRealtimeFlash] = useState(false)
  const [joinUrl, setJoinUrl] = useState('')
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string
    participantName: string
    action: string
    timestamp: Date
    status: 'unpaid' | 'paid'
  }>>([])
  const [previousParticipants, setPreviousParticipants] = useState<ParticipantStatus[]>([])

<<<<<<< HEAD
  // CLEAN ANIMATION STATE MANAGEMENT
  const [isClient, setIsClient] = useState(false)
  const [animationState, setAnimationState] = useState<'idle' | 'drawing' | 'spinning' | 'revealing' | 'complete'>('idle')
  const [currentDrawnParticipant, setCurrentDrawnParticipant] = useState<string | null>(null)
  const [spinningNumber, setSpinningNumber] = useState(1)
  const [finalHorseNumber, setFinalHorseNumber] = useState<number | null>(null)
  const [finalHorseName, setFinalHorseName] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showDrawnConfirmation, setShowDrawnConfirmation] = useState(false)
  const [loadingDots, setLoadingDots] = useState(1)
  const [loadingDirection, setLoadingDirection] = useState<'up' | 'down'>('up')

  // Animation refs
  const spinningIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const loadingDotsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // SIMPLE ANIMATION GUARD: Track initial assignment IDs only
  const initialAssignmentIds = useRef<Set<string>>(new Set())
  const initialDataCaptured = useRef(false)
  // Track which specific assignments have been animated (separate from initial)
  const animatedAssignmentIds = useRef<Set<string>>(new Set())

  // Client-side hydration flag
  useEffect(() => {
    setIsClient(true)
  }, [])
=======
  // Draw state management for smooth transitions
  const [drawState, setDrawState] = useState<'idle' | 'revealing' | 'revealed'>('idle')
>>>>>>> fc2a5e1

  // Use the real-time assignments hook with relations
  console.log('[HOOK] LIVE PAGE - About to call useRealtimeAssignments hook with eventId:', eventId)

  let assignments, assignmentsLoading, assignmentsRealtimeState, refreshAssignments
  try {
    const hookResult = useRealtimeAssignments(eventId, {
      includeRelations: true,
      onAssignmentAdded: (assignment) => {
        console.log('[ASSIGNMENT] New assignment added callback triggered:', {
          assignmentId: assignment.id,
          eventId: assignment.event_id,
          participantName: assignment.patron_entries?.participant_name,
          horseName: assignment.event_horses?.name,
          horseNumber: assignment.event_horses?.number,
          timestamp: new Date().toISOString()
        })

        setNewAssignmentId(assignment.id)
        setLastUpdate(new Date())

        // Trigger visual flash indicator
        setRealtimeFlash(true)
        setTimeout(() => {
          setRealtimeFlash(false)
        }, 1000)

        setTimeout(() => {
          console.log('[HIGHLIGHT] Clearing new assignment highlight for:', assignment.id)
          setNewAssignmentId(null)
        }, 3000)
      },
      onError: (error) => {
        console.error('Assignment subscription error:', error)
        setComponentError(`Assignment hook error: ${error?.toString()}`)
      }
    })

    console.log('[HOOK] LIVE PAGE - useRealtimeAssignments hook returned successfully:', hookResult)

    assignments = hookResult.assignments
    assignmentsLoading = hookResult.loading
    assignmentsRealtimeState = hookResult.realtimeState
    refreshAssignments = hookResult.refresh

  } catch (error) {
    console.error('[ERROR] LIVE PAGE - ERROR calling useRealtimeAssignments hook:', error)
    // Provide fallback values
    assignments = []
    assignmentsLoading = false
    assignmentsRealtimeState = { isConnected: false, isReconnecting: false, error: null, lastUpdated: null }
    refreshAssignments = () => Promise.resolve()
  }

  // Use the real-time participants hook
  const {
    participants,
    loading: participantsLoading,
    realtimeState: participantsRealtimeState,
    refresh: refreshParticipants
  } = useRealtimeParticipants(eventId, {
    onParticipantAdded: (participant) => {
      console.log('[PARTICIPANT] New participant added')
      setLastUpdate(new Date())

      setEvent(prev => prev ? {
        ...prev,
        participant_count: (prev.participant_count || 0) + 1
      } : null)
    },
    onParticipantRemoved: (participantId) => {
      console.log('[PARTICIPANT] Participant removed')
      setLastUpdate(new Date())

      setEvent(prev => prev ? {
        ...prev,
        participant_count: Math.max((prev.participant_count || 1) - 1, 0)
      } : null)
    },
    onError: (error) => {
      console.error('Participants subscription error:', error)
      setComponentError(`Participants hook error: ${error?.toString()}`)
    }
  })

  // Combined realtime state with polling fallback
  const realtimeConnected = assignmentsRealtimeState.isConnected && participantsRealtimeState.isConnected
  const realtimeState = {
    isConnected: realtimeConnected || pollingActive,
    isReconnecting: assignmentsRealtimeState.isReconnecting || participantsRealtimeState.isReconnecting,
    error: assignmentsRealtimeState.error || participantsRealtimeState.error,
    lastUpdated: assignmentsRealtimeState.lastUpdated || participantsRealtimeState.lastUpdated,
    connectionType: realtimeConnected ? 'realtime' : pollingActive ? 'polling' : 'disconnected'
  }

<<<<<<< HEAD
  // CLEAN INITIAL DATA CAPTURE: Capture assignment IDs when data first loads
  useEffect(() => {
    // Only capture once when initial load completes
    if (!initialDataCaptured.current && !assignmentsLoading && !loading && assignments.length >= 0) {
      console.log('[INIT] Capturing initial assignment IDs:', assignments.length)
      
      // Clear and populate the set with initial IDs
      initialAssignmentIds.current.clear()
      assignments.forEach(assignment => {
        initialAssignmentIds.current.add(assignment.id)
      })
      
      initialDataCaptured.current = true
      console.log('[INIT] Initial data captured with IDs:', Array.from(initialAssignmentIds.current))
    }
  }, [assignmentsLoading, loading, assignments])
=======
  // Manage draw state transitions based on assignments
  useEffect(() => {
    // Get the most recent assignment inline
    const sortedAssignments = assignments?.length > 0
      ? [...assignments].sort((a, b) =>
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        )
      : []
    const recentAssignment = sortedAssignments[0] || null

    if (!recentAssignment) {
      setDrawState('idle')
    } else {
      // Trigger revealing state, then move to revealed after a brief delay
      setDrawState('revealing')

      setTimeout(() => {
        setDrawState('revealed')
      }, 800) // Brief transition period
    }
  }, [assignments])
>>>>>>> fc2a5e1

  // Convert assignments to recent assignments format
  useEffect(() => {
    const formatted = assignments
      .filter(a => a.patron_entries && a.event_horses)
      .map(assignment => ({
        id: assignment.id,
        participant_name: assignment.patron_entries?.participant_name || 'Unknown',
        horse_number: assignment.event_horses?.number || 0,
        horse_name: assignment.event_horses?.name || 'Unknown Horse',
        jockey: assignment.event_horses?.jockey,
        created_at: assignment.created_at,
        isNew: assignment.id === newAssignmentId
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setRecentAssignments(formatted)
  }, [assignments, newAssignmentId])

  // Track participant changes for Recent Activity
  useEffect(() => {
    // Generate activity entries for new/changed participants
    const generateActivity = (newParticipants: ParticipantStatus[], oldParticipants: ParticipantStatus[]) => {
      const activities: Array<{
        id: string
        participantName: string
        action: string
        timestamp: Date
        status: 'unpaid' | 'paid'
      }> = []

      // Check for new participants
      newParticipants.forEach(newP => {
        const existingP = oldParticipants.find(oldP => oldP.id === newP.id)
        if (!existingP) {
          // New participant joined - no horse info in ACTIVE status
          activities.push({
            id: `${newP.id}-joined`,
            participantName: newP.participant_name,
            action: newP.payment_status === 'paid' ? 'Joined & Paid' : 'Joined - Not Paid',
            timestamp: newP.created_at ? new Date(newP.created_at) : new Date(),
            status: newP.payment_status === 'paid' ? 'paid' : 'unpaid'
          })
        } else if (existingP.payment_status !== newP.payment_status && newP.payment_status === 'paid') {
          // Payment status changed to paid
          activities.push({
            id: `${newP.id}-paid`,
            participantName: newP.participant_name,
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
      const newActivities = generateActivity(participants, previousParticipants)
      if (newActivities.length > 0) {
        console.log('[ACTIVITY] New activities generated:', newActivities.length)
        setRecentActivity(prev => [...newActivities, ...prev].slice(0, 5))
      }
    } else {
      // First load - show initial participants as activities
      const initialActivities = participants.map(p => ({
        id: `${p.id}-initial`,
        participantName: p.participant_name,
        action: p.payment_status === 'paid' ? 'Joined & Paid' : 'Joined - Not Paid',
        timestamp: p.created_at ? new Date(p.created_at) : new Date(),
        status: p.payment_status === 'paid' ? 'paid' as const : 'unpaid' as const
      })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)
      setRecentActivity(initialActivities)
    }

    setPreviousParticipants(participants)
    console.log('[PARTICIPANTS] Updated participants:', participants.map(p => `${p.participant_name} (${p.payment_status || 'unknown'})`).join(', '))
  }, [participants, previousParticipants])

  // NOTE: Subscription effect moved after loadEventData definition to fix dependency issue

  // Polling functions for demo/fallback mode
  const startPolling = () => {
    console.log('[POLLING] startPolling called')
    console.log('[DEBUG] Current polling interval:', pollingInterval)
    console.log('[DEBUG] Current pollingActive:', pollingActive)
    console.log('[DEBUG] realtimeConnected:', realtimeConnected)

    if (pollingInterval) {
      console.log('[DEBUG] Clearing existing polling interval')
      clearInterval(pollingInterval)
    }

    console.log('[POLLING] Starting polling mode for live updates...')
    setPollingActive(true)

    const interval = setInterval(async () => {
      console.log('[POLLING] Polling interval triggered at:', new Date().toISOString())
      console.log('[POLLING] Real-time connected status:', realtimeConnected)
      console.log('[POLLING] Assignment realtime state:', assignmentsRealtimeState)
      console.log('[POLLING] Participant realtime state:', participantsRealtimeState)

      try {
        // Only poll if real-time isn't working
        if (!realtimeConnected) {
          console.log('[POLLING] Real-time not connected, starting polling queries...')
          const startTime = Date.now()
          await Promise.all([
            pollAssignments(),
            pollParticipants(),
            pollEventStatus(),
            pollResults()
          ])
          const endTime = Date.now()
          console.log(`[POLLING] All polling queries completed in ${endTime - startTime}ms`)
          setLastUpdate(new Date())
        } else {
          console.log('[POLLING] Real-time is connected, skipping polling')
        }
      } catch (error) {
        console.error('[POLLING] Polling error:', error)
      }
    }, 2000) // Poll every 2 seconds

    console.log('[DEBUG] Polling interval created:', interval)
    setPollingInterval(interval)
  }

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    setPollingActive(false)
    console.log('[POLLING] Stopped polling mode')
  }

  const pollAssignments = async () => {
    console.log('[POLLING] pollAssignments started - calling refreshAssignments hook')
    console.log('[POLLING] Current assignments count:', assignments.length)
    console.log('[POLLING] refreshAssignments function available:', !!refreshAssignments)

    try {
      if (refreshAssignments) {
        const beforeCount = assignments.length
        await refreshAssignments()
        console.log(`[POLLING] Assignments refreshed via hook - before: ${beforeCount}, after: ${assignments.length}`)
      } else {
        console.warn('[POLLING] refreshAssignments function not available')
      }
    } catch (error) {
      console.error('[POLLING] Error refreshing assignments:', error)
    }
  }

  const pollParticipants = async () => {
    console.log('[DEBUG] pollParticipants started - calling refreshParticipants hook')
    try {
      if (refreshParticipants) {
        await refreshParticipants()
        console.log('[DEBUG] Participants refreshed via hook')
      } else {
        console.warn('[DEBUG] refreshParticipants function not available')
      }
    } catch (error) {
      console.error('[DEBUG] Error refreshing participants:', error)
    }
  }

  const pollEventStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('status')
        .eq('id', eventId)
        .single()

      if (error) throw error

      if (data && event && data.status !== event.status) {
        console.log(`[POLLING] Event status changed: ${event.status} -> ${data.status}`)
        setEvent(prev => prev ? {
          ...prev,
          status: data.status
        } : null)

        // If event becomes completed, reload to get results
        if (data.status === 'completed') {
          loadEventData()
        }
      }
    } catch (error) {
      console.error('Error polling event status:', error)
    }
  }

  const pollResults = async () => {
    try {
      if (!event || event.status !== 'completed') return

      const { data, error } = await supabase
        .from('event_results')
        .select(`
          id,
          place,
          event_horse_id,
          patron_entry_id,
          prize_amount,
          collected,
          collected_at,
          patron_entries!patron_entry_id (
            participant_name
          ),
          event_horses!event_horse_id (
            number,
            name
          )
        `)
        .eq('event_id', eventId)
        .order('place')

      if (error) throw error

      // Check if results have changed
      if (JSON.stringify(data) !== JSON.stringify(results)) {
        console.log('[POLLING] Results updated')
        setResults(data || [])
      }
    } catch (error) {
      console.error('Error polling results:', error)
    }
  }

  // Auto-start polling if real-time isn't connected after initial load
  useEffect(() => {
    console.log('[DEBUG] Auto-polling effect triggered:', {
      loading,
      realtimeConnected,
      pollingActive,
      eventId
    })

    if (!loading && !realtimeConnected && !pollingActive) {
      console.log('[DEBUG] Setting up auto-polling timer (5 seconds)')
      // Start polling after a short delay to give real-time a chance
      const timer = setTimeout(() => {
        console.log('[DEBUG] Auto-polling timer triggered, checking real-time status...')
        if (!realtimeConnected) {
          console.log('[DEBUG] Real-time still not connected, starting polling')
          startPolling()
        } else {
          console.log('[DEBUG] Real-time connected, skipping auto-polling')
        }
      }, 5000) // Wait 5 seconds before falling back to polling

      return () => {
        console.log('[DEBUG] Cleaning up auto-polling timer')
        clearTimeout(timer)
      }
    } else {
      console.log('[DEBUG] Skipping auto-polling setup:', {
        loading: loading ? 'still loading' : 'loaded',
        realtimeConnected: realtimeConnected ? 'connected' : 'not connected',
        pollingActive: pollingActive ? 'already active' : 'not active'
      })
    }
  }, [loading, realtimeConnected, pollingActive])

  // Stop polling when real-time connects
  useEffect(() => {
    if (realtimeConnected && pollingActive) {
      stopPolling()
    }
  }, [realtimeConnected, pollingActive])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const loadEventData = useCallback(async () => {
    console.log('[loadEventData] Started at:', new Date().toISOString())
    console.log('[DEBUG] loadEventData started for eventId:', eventId)
    try {
      setError(null)

      // Get event details (public access, bypasses RLS)
      console.log('[DEBUG] Fetching event data from API...')
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'GET'
      })

      console.log('[DEBUG] API response status:', response.status, response.ok)

      if (!response.ok) {
        console.error('[DEBUG] API response not ok:', response.status)
        setError('Event not found')
        return
      }

      const data = await response.json()
      console.log('[DEBUG] API response data:', data)

      if (!data.success) {
        console.error('[DEBUG] API response not successful:', data.error)
        setError(data.error || 'Failed to load event')
        return
      }

      console.log('[DEBUG] Setting event data:', data.data.event)
      setEvent({
        ...data.data.event,
        participant_count: data.data.participantCount
      })

      // Fetch horses data
      console.log('[DEBUG] Fetching horses data...')
      try {
        const { data: horsesData, error: horsesError } = await supabase
          .from('event_horses')
          .select('*')
          .eq('event_id', eventId)
          .order('number')

        if (horsesError) {
          console.error('❌ [DEBUG] Horses query error:', horsesError)
        } else {
          console.log('[DEBUG] Successfully fetched horses:', horsesData?.length || 0)
          setHorses(horsesData || [])
        }
      } catch (horsesErr) {
        console.error('❌ [DEBUG] Error fetching horses:', horsesErr)
      }

      // Force refresh assignments from Supabase directly
      console.log('[DEBUG] Refreshing assignments data...')
      try {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select(`
            *,
            event_horses!event_horse_id(*),
            patron_entries!patron_entry_id(*)
          `)
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })

        console.log('[DEBUG] Direct assignments query result:', {
          data: assignmentsData,
          error: assignmentsError,
          count: assignmentsData?.length
        })

        if (assignmentsError) {
          console.error('❌ [DEBUG] Assignments query error:', assignmentsError)
        } else {
          console.log('[DEBUG] Successfully fetched assignments:', assignmentsData?.length || 0)
          // Note: We can't directly update the assignment state from hooks
          // This will help us see if the query is working
        }
      } catch (assignmentErr) {
        console.error('❌ [DEBUG] Error fetching assignments:', assignmentErr)
      }

      // Get results (if event is completed)
      if (data.data.event.status === 'completed') {
        console.log('[DEBUG] Event completed, fetching results...')
        const { data: resultsData, error: resultsError } = await supabase
          .from('event_results')
          .select(`
            id,
            place,
            event_horse_id,
            patron_entry_id,
            prize_amount,
            collected,
            collected_at,
            patron_entries!patron_entry_id (
              participant_name
            ),
            event_horses!event_horse_id (
              number,
              name
            )
          `)
          .eq('event_id', eventId)
          .order('place')

        console.log('[DEBUG] Results query result:', { data: resultsData, error: resultsError })

        if (!resultsError && resultsData) {
          setResults(resultsData)
        }
      }

      console.log('[DEBUG] loadEventData completed successfully')
      setLastUpdate(new Date())
    } catch (err) {
      console.error('❌ [DEBUG] Error loading live data:', err)
      setError('Failed to load event data')
    } finally {
      setLoading(false)
    }
  }, [eventId, supabase])

  // Set up comprehensive real-time subscription AFTER loadEventData is defined
  useEffect(() => {
    if (!eventId) return

    console.log('[DATA] Initial mount - fetching event data for:', eventId)
    console.log('[loadEventData] Called at:', new Date().toISOString(), 'from initial mount')
    loadEventData()

    // Set up comprehensive real-time subscription for all live view changes
    console.log('[SUBSCRIPTION] Setting up real-time subscription for event:', eventId)
    const channel = supabase
      .channel(`event-${eventId}-live-comprehensive`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'patron_entries', filter: `event_id=eq.${eventId}` },
        (payload) => {
          console.log('[SUBSCRIPTION] Event received:', payload.eventType, 'from', payload.table)
          console.log('[EVENT] Event type:', payload.eventType)
          console.log('[TABLE] Table:', payload.table)
          if (payload.eventType === 'UPDATE') {
            console.log('[UPDATE] Payment status changed:', {
              old: payload.old?.payment_status,
              new: payload.new?.payment_status,
              participant: payload.new?.participant_name
            })
          }
          console.log('[TRIGGER] Triggering loadEventData() due to patron_entries change')
          console.log('[loadEventData] Called at:', new Date().toISOString(), 'from patron_entries subscription')
          loadEventData()
          setLastUpdate(new Date())

          // Trigger visual flash indicator
          setRealtimeFlash(true)
          setTimeout(() => {
            setRealtimeFlash(false)
          }, 1000)
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        (payload) => {
          console.log('[SUBSCRIPTION] Event received:', payload.eventType, 'from', payload.table)
          console.log('[EVENT] Event type:', payload.eventType)
          console.log('[TRIGGER] Triggering loadEventData() due to assignments change')
          console.log('[loadEventData] Called at:', new Date().toISOString(), 'from assignments subscription')
          loadEventData()
          setLastUpdate(new Date())

          // Also refresh assignments hook
          if (refreshAssignments) {
            refreshAssignments()
          }

          // Trigger visual flash indicator
          setRealtimeFlash(true)
          setTimeout(() => {
            setRealtimeFlash(false)
          }, 1000)
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'event_results', filter: `event_id=eq.${eventId}` },
        (payload) => {
          console.log('[SUBSCRIPTION] Event received:', payload.eventType, 'from', payload.table)
          console.log('[RESULTS] Results updated via real-time')
          console.log('[loadEventData] Called at:', new Date().toISOString(), 'from event_results subscription')
          loadEventData()
          setLastUpdate(new Date())
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          console.log('[SUBSCRIPTION] Event received:', payload.eventType, 'from', payload.table)
          console.log('[STATUS] Event status updated:', payload.new?.status)
          const updatedEvent = payload.new as Event
          setEvent(prev => prev ? {
            ...prev,
            status: updatedEvent.status
          } : null)

          if (updatedEvent.status === 'completed') {
            console.log('[COMPLETE] Event completed, reloading data for results')
            console.log('[loadEventData] Called at:', new Date().toISOString(), 'from events status=completed')
            loadEventData()
          }

          setLastUpdate(new Date())
        }
      )
      .subscribe((status) => {
        console.log('[SUBSCRIPTION] Comprehensive subscription status:', status)
      })

    return () => {
      console.log('[CLEANUP] Cleaning up comprehensive subscription')
      supabase.removeChannel(channel)
    }
  }, [eventId, loadEventData, refreshAssignments, supabase])

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  function formatCurrency(amount: number) {
    // Format for TV display with clean, readable currency
    const formatted = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)

    // Replace "A$" with "$" for cleaner display
    return formatted.replace('A$', '$')
  }

  function getStatusBadge(status: string) {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      drawing: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    const labels = {
      draft: 'Coming Soon',
      active: 'Join Now!',
      drawing: 'Draw in Progress',
      completed: 'Event Complete',
      cancelled: 'Cancelled'
    }

    return (
      <Badge className={colors[status] || colors.draft}>
        {labels[status] || status}
      </Badge>
    )
  }

  // CLEAN ANIMATION FUNCTIONS
  const startDrawAnimation = useCallback((newAssignment: any) => {
    if (!isClient) return

    console.log('[ANIM-START] Starting draw animation for:', newAssignment.id, 'at', new Date().toISOString())

    // Set the participant and horse details
    setCurrentDrawnParticipant(newAssignment?.patron_entries?.participant_name || null)
    setFinalHorseNumber(newAssignment?.event_horses?.number || null)
    setFinalHorseName(newAssignment?.event_horses?.name || null)

    // Start animation sequence
    setAnimationState('drawing')

    // Start the spinning numbers effect after a brief delay
    setTimeout(() => {
      startHorseNumberSpinning()
    }, 500)

    // Stop spinning and reveal after 3 seconds
    setTimeout(() => {
      stopSpinningAndReveal()
    }, 3500)
  }, [isClient])

  const startHorseNumberSpinning = useCallback(() => {
    if (!isClient) return

    setAnimationState('spinning')
    let currentNumber = 1

    const spin = () => {
      setSpinningNumber(currentNumber)
      currentNumber = (currentNumber % 24) + 1
    }

    // Start fast spinning
    const fastInterval = setInterval(spin, 50)
    spinningIntervalRef.current = fastInterval

    // After 2 seconds, slow down
    setTimeout(() => {
      clearInterval(fastInterval)
      const slowInterval = setInterval(spin, 150)
      spinningIntervalRef.current = slowInterval

      // After another second, very slow
      setTimeout(() => {
        clearInterval(slowInterval)
        const verySlowInterval = setInterval(spin, 300)
        spinningIntervalRef.current = verySlowInterval
      }, 1000)
    }, 2000)
  }, [isClient])

  const stopSpinningAndReveal = useCallback(() => {
    if (!isClient) return

    // Clear any spinning intervals
    if (spinningIntervalRef.current) {
      clearInterval(spinningIntervalRef.current)
      spinningIntervalRef.current = null
    }

    setAnimationState('revealing')

    // Set final number
    if (finalHorseNumber) {
      setSpinningNumber(finalHorseNumber)
    }

    // Show confetti
    setTimeout(() => {
      triggerConfettiBurst()
    }, 200)

    // Show drawn confirmation
    setTimeout(() => {
      setShowDrawnConfirmation(true)
      setAnimationState('complete')
    }, 800)

    // Reset animation state after showing for a while
    setTimeout(() => {
      console.log('[ANIM-RESET] Resetting animation state to idle after 5 seconds')
      setAnimationState('idle')
      setShowDrawnConfirmation(false)
      setShowConfetti(false)
      // Clear the current drawn participant to prepare for next draw
      setCurrentDrawnParticipant(null)
      setFinalHorseNumber(null)
      setFinalHorseName(null)
    }, 5000)
  }, [finalHorseNumber, isClient])

  const triggerConfettiBurst = useCallback(() => {
    // Only trigger confetti on client-side
    if (typeof window !== 'undefined' && isClient) {
      setShowConfetti(true)

      // Visual confetti animation (no canvas-confetti dependency)
      setTimeout(() => {
        setShowConfetti(false)
      }, 3000)
    }
  }, [isClient])

  // Animate loading dots for "NEXT DRAW" state
  useEffect(() => {
    if (animationState === 'idle' && event?.status === 'drawing' && !currentDrawnParticipant) {
      const interval = setInterval(() => {
        setLoadingDots(prev => {
          if (loadingDirection === 'up') {
            if (prev >= 3) {
              setLoadingDirection('down')
              return 2
            }
            return prev + 1
          } else {
            if (prev <= 1) {
              setLoadingDirection('up')
              return 2
            }
            return prev - 1
          }
        })
      }, 600)

      loadingDotsIntervalRef.current = interval

      return () => {
        if (loadingDotsIntervalRef.current) {
          clearInterval(loadingDotsIntervalRef.current)
        }
      }
    }

    return () => {
      if (loadingDotsIntervalRef.current) {
        clearInterval(loadingDotsIntervalRef.current)
      }
    }
  }, [animationState, loadingDirection, isClient, event?.status, currentDrawnParticipant])

  // Function to get the most recent assignment for drawing display
  const getMostRecentAssignment = useCallback(() => {
    if (!assignments || assignments.length === 0) return null

    // Sort assignments by created_at descending to get the most recent
    const sortedAssignments = [...assignments].sort((a, b) =>
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )

    return sortedAssignments[0]
  }, [assignments])

  // CLEAN ANIMATION TRIGGER: Only animate truly new assignments
  useEffect(() => {
    console.log('[ANIM-CHECK] Animation trigger fired', {
      animationState,
      assignmentCount: assignments.length,
      eventStatus: event?.status,
      timestamp: new Date().toISOString()
    })

    // Guard: Must have initial data captured
    if (!initialDataCaptured.current) {
      console.log('[ANIM-CHECK] Skipping: Initial data not captured yet')
      return
    }

    // Guard: Must be in drawing status
    if (event?.status !== 'drawing') {
      console.log('[ANIM-CHECK] Skipping: Not in drawing status')
      return
    }

    // Guard: Animation must be idle
    if (animationState !== 'idle') {
      console.log('[ANIM-CHECK] Skipping: Animation already in progress, state:', animationState)
      return
    }

    // Get the most recent assignment
    const mostRecentAssignment = getMostRecentAssignment()
    if (!mostRecentAssignment) {
      console.log('[ANIM-CHECK] Skipping: No assignments found')
      return
    }

    console.log('[ANIM-CHECK] Most recent assignment:', mostRecentAssignment.id)
    console.log('[ANIM-CHECK] Already animated IDs:', Array.from(animatedAssignmentIds.current))
    console.log('[ANIM-CHECK] Initial IDs:', Array.from(initialAssignmentIds.current))

    // CRITICAL GUARD: Check if this assignment was in initial load
    if (initialAssignmentIds.current.has(mostRecentAssignment.id)) {
      console.log('[ANIM-CHECK] Skipping: Assignment was in initial load', mostRecentAssignment.id)
      return
    }

    // NEW GUARD: Check if we've already animated this assignment
    if (animatedAssignmentIds.current.has(mostRecentAssignment.id)) {
      console.log('[ANIM-CHECK] Skipping: Assignment already animated', mostRecentAssignment.id)
      return
    }

    // This is a genuinely new assignment - animate it!
    console.log('[ANIM-START] New assignment detected, starting animation:', mostRecentAssignment.id)

    // Track that we're animating this assignment
    animatedAssignmentIds.current.add(mostRecentAssignment.id)

    // Start the animation
    startDrawAnimation(mostRecentAssignment)

  }, [assignments, event?.status, animationState, getMostRecentAssignment, startDrawAnimation])

  // Function to get already drawn participants for the bottom display
  const getDrawnParticipants = () => {
    return assignments.slice().reverse() // Show in reverse order (most recent first)
  }

// At the very top of DrawingStateView component
useEffect(() => {
  console.log('🔴 DrawingStateView MOUNTED')
  return () => console.log('🔴 DrawingStateView UNMOUNTED')
}, [])

  // DrawingStateView component with clean animations
  const DrawingStateView = () => {
    // Keep container always mounted, handle loading state internally
    const drawnParticipants = isClient ? getDrawnParticipants() : []


    // Character animation for participant names
    const CharacterShiftName = ({ name, isAnimating }: { name: string, isAnimating: boolean }) => {
      if (!name) return <span>NEXT DRAW</span>

      return (
        <AnimatePresence mode="wait">
          {name.split('').map((char, index) => (
            <motion.span
              key={`${name}-${index}`}
              initial={isAnimating ? { y: 100, opacity: 0 } : { y: 0, opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: "easeOut"
              }}
              style={{ display: 'inline-block' }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </AnimatePresence>
      )
    }

    return (
      <div className="min-h-screen bg-[#f8f7f4] overflow-hidden w-screen h-screen relative" style={{ minWidth: '1920px', minHeight: '1080px' }}>
        {/* Loading overlay - renders on top without unmounting container */}
        <AnimatePresence>
          {(isLoading || !isClient) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#f8f7f4] z-[100] flex items-center justify-center"
            >
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-slate-900 mx-auto mb-6" />
                <p className="text-2xl text-slate-600 font-['Arial']">Loading...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent confetti canvas - always mounted, controlled by state */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-[90]"
            >
              {/* Confetti visual effect */}
              <div className="absolute inset-0">
                {Array.from({ length: 50 }).map((_, i) => (
                  <motion.div
                    key={`confetti-${i}`}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      backgroundColor: ['#ff8a00', '#ff4d8d', '#8b5cf6'][Math.floor(Math.random() * 3)]
                    }}
                    initial={{ y: -20, opacity: 1 }}
                    animate={{
                      y: window.innerHeight + 20,
                      x: (Math.random() - 0.5) * 200,
                      rotate: Math.random() * 720,
                      opacity: 0
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      ease: 'linear'
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Flash Indicator */}
        <AnimatePresence>
          {realtimeFlash && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-3 z-50"
            >
              <p className="text-2xl font-bold">⚡ REAL-TIME UPDATE RECEIVED!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Section - DRAWING LIVE badge, NO QR CODE */}
        <div className="h-[120px] bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8">
          {/* Left: Venue Avatar + Event Details */}
          <div className="flex items-center space-x-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{
                background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
              }}
            >
              {event.tenant?.name?.charAt(0) || 'V'}
            </div>

            <div>
              <div className="flex items-center space-x-4">
                <h1 className="text-4xl font-bold text-slate-900 font-['Arial']">
                  {event?.name || 'Loading Event...'}
                </h1>

                {/* DRAWING LIVE Badge */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-6 py-3 rounded-full flex items-center space-x-2 shadow-lg"
                  style={{
                    background: 'linear-gradient(90deg, #fb2c36 0%, #ff4d8d 100%)'
                  }}
                >
                  <Radio className="h-6 w-6 text-white" />
                  <span className="text-white font-bold text-2xl font-['Arial']">
                    🎯 DRAWING LIVE
                  </span>
                </motion.div>
              </div>
              <p className="text-xl text-slate-600 font-['Arial'] mt-1">
                {event.tenant?.name || 'Live Event'}
              </p>
            </div>
          </div>

          {/* Right: Prize Pool (NO QR CODE during drawing) */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="h-24 rounded-2xl flex flex-col items-center justify-center px-8 shadow-lg"
            style={{
              background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
            }}
          >
            <p className="text-white/80 text-sm font-['Arial'] mb-1">PRIZE POOL</p>
            <div className="text-3xl font-bold text-white font-['Arial']">
              {event?.entry_fee === 0 ? 'FREE' : formatCurrency((event?.capacity || 0) * (event?.entry_fee || 0))}
            </div>
          </motion.div>
        </div>

        {/* Main Drawing Display Area */}
        <div className="flex-1 relative" style={{
          background: 'linear-gradient(180deg, #1f2937 0%, #111827 50%, #0f172a 100%)',
          height: '780px'
        }}>
          {/* Subtle radial gradient overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.3) 0%, rgba(84,43,124,0.15) 35%, transparent 70%)'
            }}
          />

          {/* Confetti overlay */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {Array.from({ length: 50 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    y: -20,
                    x: Math.random() * window.innerWidth,
                    rotate: 0,
                    opacity: 1
                  }}
                  animate={{
                    y: window.innerHeight + 100,
                    rotate: 360,
                    opacity: 0
                  }}
                  transition={{
                    duration: Math.random() * 2 + 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut"
                  }}
                  className="absolute w-3 h-3 rounded"
                  style={{
                    backgroundColor: ['#ff8a00', '#ff4d8d', '#8b5cf6', '#05df72', '#fbbf24'][Math.floor(Math.random() * 5)]
                  }}
                />
              ))}
            </div>
          )}

          {/* Central Drawing Display */}
          <div className="absolute top-14 left-1/2 transform -translate-x-1/2 w-[500px] h-[752px]">
            {/* Participant Avatar/Initials */}
            <div className="flex justify-center mb-6">
              <motion.div
                key={currentDrawnParticipant || 'default'}
                initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.6, ease: "backOut" }}
                className="w-40 h-40 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-2xl"
                style={{
                  background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
                }}
              >
                {currentDrawnParticipant ?
                  currentDrawnParticipant.split(' ').map(n => n[0]).join('').toUpperCase()
                  : 'MC'
                }
              </motion.div>
            </div>

            {/* Participant Name with Character Animation */}
            <div className="text-center mb-8">
              <motion.h1
                className="text-6xl font-bold text-white font-['Arial'] mb-4"
                key={currentDrawnParticipant || 'default'}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <CharacterShiftName
                  name={currentDrawnParticipant?.toUpperCase() || 'NEXT DRAW'}
                  isAnimating={animationState === 'drawing'}
                />
                {animationState === 'idle' && !currentDrawnParticipant && (
                  <span className="animate-pulse">
                    {'.'.repeat(loadingDots)}
                  </span>
                )}
              </motion.h1>

              {/* Drawn Confirmation */}
              <AnimatePresence>
                {showDrawnConfirmation && (
                  <motion.div
                    initial={{ scale: 0, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0, y: -20, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.6 }}
                    className="text-5xl font-bold text-[#05df72] font-['Arial']"
                  >
                    ✓ DRAWN!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Horse Card Display with Animation */}
            <AnimatePresence mode="wait">
              {(currentDrawnParticipant || animationState !== 'idle') && (
                <motion.div
                  key={finalHorseNumber || 'spinning'}
                  initial={{ y: 100, opacity: 0, rotateX: -90 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  exit={{ y: -100, opacity: 0, rotateX: 90 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative"
                >
                  <div className="bg-white border-4 border-black/10 rounded-3xl p-1 shadow-2xl">
                    <div
                      className="rounded-3xl p-6 h-[300px] flex flex-col items-center justify-center"
                      style={{
                        background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
                      }}
                    >
                      <div className="bg-white rounded-3xl p-8 w-full h-full flex flex-col items-center justify-center">
                        {/* Horse Number with Spinning Animation */}
                        <motion.div
                          className="text-[120px] font-black leading-none mb-4"
                          style={{
                            background: 'linear-gradient(90deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                          animate={animationState === 'spinning' ? {
                            scale: [1, 1.1, 1],
                            rotateY: [0, 10, -10, 0]
                          } : {}}
                          transition={{
                            duration: 0.3,
                            repeat: animationState === 'spinning' ? Infinity : 0
                          }}
                        >
                          #{animationState === 'spinning' ? spinningNumber : (finalHorseNumber || '--')}
                        </motion.div>

                        {/* Horse Name with Fade Up */}
                        <motion.div
                          initial={{ y: 30, opacity: 0 }}
                          animate={{ y: 0, opacity: animationState === 'complete' ? 1 : 0.7 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="text-4xl text-slate-600 font-['Arial'] text-center"
                        >
                          {finalHorseName || 'HORSE NAME'}
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Section - Already Drawn with Scrolling Pills */}
        <div className="h-[180px] bg-gray-800 px-8 flex items-center justify-between">
          {/* Left: Already Drawn List with Scrolling Animation */}
          <div className="flex-1">
            <h3 className="text-xl text-white/70 font-['Arial'] mb-4">ALREADY DRAWN:</h3>
            <div className="overflow-hidden">
              <motion.div
                className="flex items-center space-x-4"
                animate={{ x: drawnParticipants.length > 8 ? [0, -200, 0] : 0 }}
                transition={{
                  duration: 20,
                  repeat: drawnParticipants.length > 8 ? Infinity : 0,
                  ease: "linear"
                }}
              >
                {drawnParticipants.map((assignment, index) => (
                  <motion.div
                    key={assignment.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex-shrink-0 px-6 py-3 rounded-full flex items-center space-x-3 shadow-lg"
                    style={{
                      background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
                    }}
                  >
                    <Trophy className="h-5 w-5 text-white" />
                    <span className="text-white font-['Arial'] text-xl whitespace-nowrap">
                      {assignment.patron_entries?.participant_name?.split(' ')[0] || 'Unknown'} {assignment.patron_entries?.participant_name?.split(' ')[1]?.[0] || ''}. → #{assignment.event_horses?.number || '--'}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Right: Prize Pool */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-[200px] h-[120px] rounded-2xl flex flex-col items-center justify-center shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
            }}
          >
            <p className="text-white/80 text-base font-['Arial'] mb-1">PRIZE POOL</p>
            <div className="text-4xl font-bold text-white font-['Arial']">
              {event?.entry_fee === 0 ? 'FREE' : formatCurrency((event?.capacity || 0) * (event?.entry_fee || 0))}
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Early return for error state only
  if (error || (!loading && !event)) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 font-['Arial'] mb-4">Event Unavailable</h1>
          <p className="text-xl text-slate-600 font-['Arial']">{error || 'Event not found'}</p>
        </div>
      </div>
    )
  }

  // Show loading overlay while keeping the main view mounted
  const isLoading = loading || assignmentsLoading || participantsLoading || !event

  // Create participant status array combining participants and assignments
  const participantStatuses: ParticipantStatus[] = participants.map(participant => {
    const assignment = assignments.find(a => a.patron_entry_id === participant.id)
    return {
      id: participant.id,
      participant_name: participant.participant_name,
      horse_number: assignment?.event_horses?.number,
      horse_name: assignment?.event_horses?.name,
      has_paid: participant.payment_status === 'paid',
      payment_status: participant.payment_status,
      created_at: participant.created_at,
      assigned_at: assignment?.created_at
    }
  })

  // Calculate progress percentage
  const progressPercentage = event?.capacity ? Math.min((participants.length / event.capacity) * 100, 100) : 0

  // Calculate prize pool using event data
  const entryFee = event?.entry_fee || 0
  const totalPool = (event?.capacity || 0) * entryFee  // Total pool based on all spots
  const prizePool = totalPool

  // Calculate prize breakdown using event percentages
  const firstPrize = event?.first_place_percentage ? totalPool * (event.first_place_percentage / 100) : 0
  const secondPrize = event?.second_place_percentage ? totalPool * (event.second_place_percentage / 100) : 0
  const thirdPrize = event?.third_place_percentage ? totalPool * (event.third_place_percentage / 100) : 0

  // Get recent activity for footer with correct format
  const footerActivity = recentActivity.slice(0, 3).map(activity =>
    `${activity.participantName} ${activity.action}`
  )

<<<<<<< HEAD
  // MAIN RENDER - Keep container always mounted, change content internally
  if (event?.status === 'drawing') {
    return <DrawingStateView />
  }

  // ACTIVE state rendering
=======
  // Function to get the most recent assignment for drawing display
  const getMostRecentAssignment = () => {
    if (!assignments || assignments.length === 0) return null

    // Sort assignments by created_at descending to get the most recent
    const sortedAssignments = [...assignments].sort((a, b) =>
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )

    return sortedAssignments[0]
  }

  // Function to get already drawn participants for the bottom display
  const getDrawnParticipants = () => {
    return assignments.slice().reverse() // Show in reverse order (most recent first)
  }

  // DrawingStateView component - Exact Figma structure with comprehensive animations
  const DrawingStateView = () => {
    const recentAssignment = getMostRecentAssignment()
    const [isSpinning, setIsSpinning] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)
    const [drawingTextVisible, setDrawingTextVisible] = useState(true)

    // Trigger spin animation when new assignment comes in
    useEffect(() => {
      if (recentAssignment && newAssignmentId === recentAssignment.id) {
        setIsSpinning(true)
        setShowConfetti(true)

        // Stop spinning after animation completes
        setTimeout(() => setIsSpinning(false), 3000)

        // Hide confetti after celebration
        setTimeout(() => setShowConfetti(false), 4000)
      }
    }, [recentAssignment, newAssignmentId])

    // Animate drawing text
    useEffect(() => {
      const interval = setInterval(() => {
        setDrawingTextVisible(prev => !prev)
      }, 1500)
      return () => clearInterval(interval)
    }, [])

    return (
      <div className="bg-[#f8f7f4] relative w-full h-screen overflow-hidden" style={{ minWidth: '1920px', minHeight: '1080px' }}>
        {/* Inject TV-optimized styles */}
        <style jsx>{tvOptimizedStyles}</style>

        {/* Confetti Animation Overlay */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-[60]">
            <div className="confetti-container">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    backgroundColor: ['#ff8a00', '#ff4d8d', '#8b5cf6', '#05df72', '#fbbf24'][Math.floor(Math.random() * 5)]
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Real-time Flash Indicator - Preserved animation */}
        {realtimeFlash && (
          <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-3 z-50 animate-pulse">
            <p className="text-2xl font-bold">⚡ REAL-TIME UPDATE RECEIVED!</p>
          </div>
        )}

        <style jsx>{`
          @keyframes scroll-left {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }

          @keyframes spin-number {
            0% {
              transform: rotateX(0deg) scale(1);
              opacity: 0.5;
            }
            50% {
              transform: rotateX(360deg) scale(1.2);
              opacity: 1;
            }
            100% {
              transform: rotateX(720deg) scale(1);
              opacity: 1;
            }
          }

          @keyframes slide-up-fade {
            0% {
              transform: translateY(20px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes typewriter {
            0% {
              width: 0;
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            100% {
              width: 100%;
              opacity: 1;
            }
          }

          @keyframes confetti-fall {
            0% {
              transform: translateY(-100vh) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }

          .scroll-container {
            animation: scroll-left 20s linear infinite;
          }

          .spin-animation {
            animation: spin-number 3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            transform-style: preserve-3d;
            perspective: 1000px;
          }

          .slide-up-fade {
            animation: slide-up-fade 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
            animation-delay: 3.1s;
            animation-fill-mode: both;
          }

          .typewriter-effect {
            overflow: hidden;
            white-space: nowrap;
            animation: typewriter 2s steps(40, end) infinite alternate;
          }

          .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            animation: confetti-fall 3s linear infinite;
          }

          .pill-hover {
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .pill-hover:hover {
            transform: scale(1.05) translateY(-2px);
            box-shadow: 0px 15px 25px -5px rgba(0,0,0,0.2);
          }
        `}</style>

        {/* Header - Exact Figma structure */}
        <div className="absolute bg-white border-b border-[rgba(0,0,0,0.08)] box-border flex h-[120px] items-center justify-between left-0 px-[32px] top-0 w-[1920px]">
          <div className="h-[92px] relative w-[922px]">
            <div className="flex gap-[24px] h-[92px] items-center relative w-[922px]">
              <div className="bg-gradient-to-b from-[#ff8a00] relative rounded-full size-[80px] to-[#8b5cf6] via-50% via-[#ff4d8d] flex items-center justify-center">
                <p className="font-bold text-[24px] leading-[32px] text-white">
                  {event.tenant?.name?.charAt(0) || 'V'}
                </p>
              </div>
              <div className="flex-1 h-[92px]">
                <div className="flex flex-col gap-[4px] h-[92px] items-start w-full">
                  <div className="flex gap-[16px] h-[58px] items-center relative w-full">
                    <div className="h-[54px]">
                      <p className="font-bold text-[36px] leading-[54px] text-slate-900">
                        {event.name}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "bg-gradient-to-r from-[#fb2c36] h-[58px] rounded-full shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] to-[#ff4d8d] px-[24px] flex items-center gap-[8px]",
                        "animate-pulse"
                      )}
                    >
                      <Radio className="size-[24px] text-white animate-spin" />
                      <p className={cn(
                        "font-bold text-[28px] leading-[42px] text-white transition-opacity duration-500",
                        drawingTextVisible ? "opacity-100" : "opacity-70"
                      )}>
                        🎯 DRAWING LIVE
                      </p>
                    </div>
                  </div>
                  <div className="h-[30px] w-full">
                    <p className="text-[20px] leading-[30px] text-slate-600">
                      {event.tenant?.name || 'Live Event'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-b from-[#ff8a00] h-[120px] rounded-[20px] shadow-[0px_25px_30px_-5px_rgba(0,0,0,0.15),0px_10px_15px_-6px_rgba(0,0,0,0.1)] to-[#8b5cf6] via-50% via-[#ff4d8d] w-[240px] flex flex-col items-center justify-center border-2 border-white/20">
            <p className="text-[18px] leading-[24px] text-white font-semibold tracking-wide mb-1">
              PRIZE POOL
            </p>
            <p className="font-black text-[48px] leading-[52px] text-white text-shadow-strong">
              {entryFee === 0 ? 'FREE' : formatCurrency(prizePool)}
            </p>
          </div>
        </div>

        {/* Main Content Area - Dark gradient background */}
        <div className="absolute bg-gradient-to-b from-[#1f2937] h-[780px] left-0 overflow-hidden to-[#0f172a] top-[120px] via-50% via-[#111827] w-[1920px]">
          {/* Radial gradient overlay */}
          <div
            className="absolute h-[780px] left-0 opacity-30 top-0 w-[1920px]"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.3) 0%, rgba(84,43,124,0.15) 35%, transparent 70%)'
            }}
          />

          {/* Center Panel - Exact Figma positioning */}
          <div className="absolute h-[752px] left-[682px] top-[14px] w-[556px]">
            {/* Participant Avatar - Animated scale on new assignment */}
            <div
              className={cn(
                "absolute bg-gradient-to-b from-[#ff8a00] rounded-full shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] size-[160px] to-[#8b5cf6] via-50% via-[#ff4d8d] left-[170px] top-0 flex items-center justify-center",
                "transition-all duration-500",
                recentAssignment ? "scale-110 shadow-2xl" : "scale-100"
              )}
            >
              <p className="font-bold text-[64px] leading-[96px] text-white">
                {recentAssignment?.patron_entries?.participant_name ?
                  recentAssignment.patron_entries.participant_name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : 'MC'
                }
              </p>
            </div>

            {/* Participant Name - Animated slide up fade */}
            <div className="absolute h-[96px] left-[13px] top-[184px] w-[474px]">
              <p className={cn(
                "font-bold text-[64px] leading-[96px] text-white",
                recentAssignment && newAssignmentId === recentAssignment.id ? "slide-up-fade" : "",
                !recentAssignment && "opacity-50"
              )}>
                {recentAssignment?.patron_entries?.participant_name?.toUpperCase() || 'NEXT PARTICIPANT'}
              </p>
            </div>

            {/* Status - ✓ DRAWN! with color transition */}
            <div className="absolute h-[72px] left-[125px] top-[320px] w-[250px]">
              <p className={cn(
                "font-bold text-[48px] leading-[72px]",
                "transition-all duration-300",
                recentAssignment ? "text-[#05df72] scale-110" : "text-gray-400 opacity-50"
              )}>
                {recentAssignment ? '✓ DRAWN!' : 'WAITING...'}
              </p>
            </div>

            {/* Horse Card - Slide-in animation preserved */}
            <div className={cn(
              "absolute h-[300px] left-[-1px] top-[432px] w-[500px]",
              "transition-all duration-700 transform",
              recentAssignment
                ? "translate-y-0 opacity-100 scale-100"
                : "translate-y-8 opacity-0 scale-95"
            )}>
              {recentAssignment && (
                <div className="bg-white border-4 border-[rgba(0,0,0,0.08)] h-[300px] rounded-[24px] w-[500px]">
                  <div className="h-[300px] overflow-hidden relative rounded-[inherit] w-[500px]">
                    <div className="absolute bg-gradient-to-b from-[#ff8a00] h-[292px] left-[4px] rounded-[24px] to-[#8b5cf6] top-[4px] via-50% via-[#ff4d8d] w-[492px] flex items-center justify-center">
                      <div className="bg-white flex flex-col gap-[16px] h-[284px] items-center justify-center rounded-[24px] w-[484px]">
                        {/* Horse Number with gradient text and spin animation */}
                        <div className="h-[180px] w-[304px] flex items-center justify-center">
                          <p
                            className={cn(
                              "font-black text-[120px] leading-[180px]",
                              isSpinning ? "spin-animation" : ""
                            )}
                            style={{
                              background: 'linear-gradient(90deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text'
                            }}
                          >
                            #{recentAssignment.event_horses?.number || '--'}
                          </p>
                        </div>
                        {/* Horse Name */}
                        <div className="h-[54px] w-[304px]">
                          <p className="text-[36px] leading-[54px] text-slate-600 text-center">
                            {recentAssignment.event_horses?.name?.toUpperCase() || 'HORSE NAME'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Already Drawn Section */}
        <div className="absolute bg-gray-800 flex h-[180px] items-center justify-between left-0 px-[32px] top-[900px] w-[1920px]">
          <div className="h-[103px] w-[1888px]">
            <div className="flex flex-col gap-[16px] h-[103px] items-start overflow-hidden w-[1888px]">
              <div className="h-[30px] w-full">
                <p className="text-[20px] leading-[30px] text-[rgba(255,255,255,0.7)]">
                  ALREADY DRAWN:
                </p>
              </div>
              <div className="flex h-[57px] w-full overflow-hidden relative">
                {/* Scrolling container with unique participants only */}
                <div className="flex gap-[16px] items-center scroll-container">
                  {/* Deduplicated pills by patron_entry_id for reliability */}
                  {assignments
                    .filter((assignment, index, self) => {
                      // Filter by patron_entry_id to ensure uniqueness (more reliable than name)
                      const firstOccurrence = self.findIndex(a =>
                        a.patron_entry_id === assignment.patron_entry_id &&
                        a.patron_entries?.participant_name === assignment.patron_entries?.participant_name
                      ) === index
                      // Also ensure we have participant data
                      return firstOccurrence && assignment.patron_entries?.participant_name
                    })
                    .slice(-10).reverse().map((assignment, index) => {
                      const participantName = assignment.patron_entries?.participant_name || 'Unknown'
                      const firstName = participantName.split(' ')[0] || 'Unknown'
                      const lastInitial = participantName.split(' ')[1]?.[0] || ''

                      return (
                        <div
                          key={`participant-${assignment.patron_entry_id}`}
                          className={cn(
                            "bg-gradient-to-b from-[#ff8a00] h-[57px] rounded-full shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] to-[#8b5cf6] via-50% via-[#ff4d8d] px-[24px] flex items-center gap-[12px] flex-shrink-0",
                            "pill-hover",
                            index === 0 && newAssignmentId === assignment.id && "ring-2 ring-yellow-400 scale-105"
                          )}
                        >
                          <Trophy className="size-[20px] text-white" />
                          <p className="font-bold text-[22px] leading-[33px] text-white whitespace-nowrap">
                            {firstName} {lastInitial}{lastInitial ? '.' : ''}
                            {lastInitial ? ' ' : ''}
                            → #{assignment.event_horses?.number || '--'}
                          </p>
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CompletedStateView component - Show all participant-horse assignments
  const CompletedStateView = () => {
    // Get results sorted by place (if any)
    const sortedResults = results.sort((a, b) => a.place - b.place)
    const firstPlace = sortedResults.find(r => r.place === 1)
    const secondPlace = sortedResults.find(r => r.place === 2)
    const thirdPlace = sortedResults.find(r => r.place === 3)

    // Get all assignments sorted by horse number
    const sortedAssignments = assignments
      .filter(a => a.event_horses && a.patron_entries)
      .sort((a, b) => a.event_horses.number - b.event_horses.number)

    const getPlaceInfo = (horseNumber: number) => {
      if (firstPlace?.event_horses?.number === horseNumber) return { place: '1st', color: 'bg-yellow-400', textColor: 'text-yellow-800' }
      if (secondPlace?.event_horses?.number === horseNumber) return { place: '2nd', color: 'bg-gray-300', textColor: 'text-gray-800' }
      if (thirdPlace?.event_horses?.number === horseNumber) return { place: '3rd', color: 'bg-orange-400', textColor: 'text-orange-800' }
      return null
    }

    return (
      <div className="min-h-screen bg-[#f8f7f4] overflow-hidden w-screen h-screen relative" style={{ minWidth: '1920px', minHeight: '1080px' }}>
        {/* Header */}
        <div className="h-[120px] bg-white border-b border-[rgba(0,0,0,0.08)] flex items-center justify-between px-8">
          <div className="flex items-center space-x-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
              }}
            >
              <p className="font-bold text-[24px] leading-[32px] text-white">
                {event.tenant?.name?.charAt(0) || 'V'}
              </p>
            </div>
            <div>
              <h1 className="text-[36px] font-bold text-slate-900 leading-[54px]">
                {event.name}
              </h1>
              <p className="text-[20px] text-slate-600">
                {event.tenant?.name || 'Live Event'}
              </p>
            </div>
          </div>
          <div className="bg-[#05df72] rounded-full px-6 py-3 flex items-center gap-2">
            <Check className="w-6 h-6 text-white" />
            <span className="text-white font-bold text-[24px]">DRAW COMPLETE</span>
          </div>
        </div>

        {/* Title Section */}
        <div className="h-[100px] flex items-center justify-center bg-white border-b border-gray-200">
          <div className="flex items-center gap-6">
            <Trophy className="w-[60px] h-[60px] text-[#8b5cf6]" />
            <h2 className="text-[48px] font-bold bg-gradient-to-r from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] bg-clip-text text-transparent">
              ALL ASSIGNMENTS
            </h2>
            <Trophy className="w-[60px] h-[60px] text-[#8b5cf6]" />
          </div>
        </div>

        {/* Assignments Table */}
        <div className="h-[700px] overflow-y-auto p-8">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-2 gap-6">
              {sortedAssignments.map((assignment, index) => {
                const placeInfo = getPlaceInfo(assignment.event_horses.number)
                const isPaid = assignment.patron_entries.payment_status === 'paid'

                return (
                  <div
                    key={assignment.id}
                    className={cn(
                      "bg-white rounded-xl p-6 shadow-lg border-2 transition-all duration-300",
                      isPaid ? "border-[#05df72]" : "border-[#fe9a00]",
                      placeInfo && "ring-4 ring-yellow-400 scale-[1.02]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      {/* Horse Info */}
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-[24px]",
                          isPaid ? "bg-[#05df72]" : "bg-[#fe9a00]"
                        )}>
                          #{assignment.event_horses.number}
                        </div>
                        <div>
                          <h3 className="text-[24px] font-bold text-slate-900">
                            {assignment.event_horses.name}
                          </h3>
                          <p className="text-[16px] text-slate-600">
                            {assignment.event_horses.jockey || 'No jockey listed'}
                          </p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="w-8 h-8 text-slate-400" />

                      {/* Participant Info */}
                      <div className="text-right">
                        <h3 className="text-[24px] font-bold text-slate-900">
                          {assignment.patron_entries.participant_name}
                        </h3>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          <div className={cn(
                            "px-3 py-1 rounded-full flex items-center gap-1",
                            isPaid ? "bg-[#05df72]" : "bg-[#fe9a00]"
                          )}>
                            {isPaid ? (
                              <Check className="w-4 h-4 text-white" />
                            ) : (
                              <Clock className="w-4 h-4 text-white" />
                            )}
                            <span className="text-white font-bold text-[12px]">
                              {isPaid ? 'PAID' : 'PENDING'}
                            </span>
                          </div>
                          {placeInfo && (
                            <div className={cn(
                              "px-3 py-1 rounded-full font-bold text-[12px]",
                              placeInfo.color,
                              placeInfo.textColor
                            )}>
                              {placeInfo.place} PLACE
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="absolute bottom-0 left-0 right-0 h-[160px] bg-[#1f2937] flex items-center justify-around px-10">
          <div className="text-center">
            <p className="text-[#94a3b8] text-[18px] mb-2">Total Drawn</p>
            <p className="text-white text-[48px] font-bold">{assignments.length}</p>
          </div>

          <div className="text-center">
            <p className="text-[#94a3b8] text-[18px] mb-2">Paid & Ready</p>
            <p className="text-[#05df72] text-[48px] font-bold">
              {assignments.filter(a => a.patron_entries?.payment_status === 'paid').length}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[#94a3b8] text-[18px] mb-2">Payment Pending</p>
            <p className="text-[#fe9a00] text-[48px] font-bold">
              {assignments.filter(a => a.patron_entries?.payment_status !== 'paid').length}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[#94a3b8] text-[24px] mb-3 font-semibold tracking-wide">PRIZE POOL</p>
            <p className="text-white text-[64px] font-black text-shadow-strong">
              {entryFee === 0 ? 'FREE EVENT' : formatCurrency(prizePool)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Conditional rendering based on event status
  if (event.status === 'drawing') {
    return <DrawingStateView />
  }

  if (event.status === 'completed') {
    return <CompletedStateView />
  }

>>>>>>> fc2a5e1
  return (
    <div className="min-h-screen bg-[#f8f7f4] overflow-hidden w-screen h-screen relative" style={{ minWidth: '1920px', minHeight: '1080px' }}>
      {/* Inject TV-optimized styles */}
      <style jsx>{tvOptimizedStyles}</style>

      {/* Real-time Flash Indicator */}
      {realtimeFlash && (
        <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-3 z-50 animate-pulse">
          <p className="text-2xl font-bold">⚡ REAL-TIME UPDATE RECEIVED!</p>
        </div>
      )}

      {/* Header Section - 120px height */}
      <div className="h-[120px] bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8">
        {/* Left: Venue Avatar + Event Details */}
        <div className="flex items-center space-x-6">
          {/* Venue Avatar with Gradient */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{
              background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
            }}
          >
            {event?.tenant?.name?.charAt(0)?.toUpperCase() || 'V'}
          </div>

          {/* Event Details */}
          <div className="text-left">
            <h1 className="text-4xl font-bold text-slate-900 leading-tight">
              {event?.name || 'Event'}
            </h1>
            <p className="text-2xl text-slate-600 mt-1">
              {event?.tenant?.name || 'Venue'}
            </p>
            <p className="text-xl text-slate-600 mt-1">
              {event?.starts_at ? formatDateTime(event.starts_at) : ''}
            </p>
          </div>
        </div>

        {/* Right: QR Code + Join Text */}
        <div className="flex items-center space-x-4">
          {/* QR Code */}
          <div className="w-[100px] h-[100px] bg-white rounded-lg p-2 border border-gray-200 flex items-center justify-center">
            {joinUrl ? (
              <QRCodeSVG
                value={joinUrl}
                size={84}
                level="H"
                includeMargin={false}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            ) : (
              <QrCode className="w-20 h-20 text-gray-400" />
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">Scan to Join</p>
          </div>
        </div>
      </div>

      {/* Progress Bar Section - 100px height */}
      <div
        className="h-[100px] flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
        }}
      >
        <div className="text-center">
          <p className="font-bold text-white mb-3" style={{ fontSize: '48px' }}>
            {(event?.capacity || 0) - participants.length} / {event?.capacity || 0} SPOTS REMAINING
          </p>
          <div className="w-[600px] h-3 bg-white bg-opacity-30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status Legend - 30px height */}
      <div className="h-[30px] px-10 pt-10 flex items-center justify-start space-x-8">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#00c950]"></div>
          <span className="text-xl text-slate-700">JOINED & PAID</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#fe9a00]"></div>
          <span className="text-xl text-slate-700">JOINED - NOT PAID</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#d1d5dc]"></div>
          <span className="text-xl text-slate-700">AVAILABLE</span>
        </div>
      </div>

      {/* Horse Grid - 620px height */}
      <div className="h-[620px] px-10 py-5">
        <div className="grid grid-cols-6 gap-5 h-full">
          {Array.from({ length: 24 }, (_, index) => {
            const horse = horses.find(h => h.number === index + 1) || {
              id: `placeholder-${index + 1}`,
              number: index + 1,
              name: `Horse ${index + 1}`,
              jockey: '',
              is_scratched: false
            }

            // In ACTIVE status, show participants in order even without horse assignments
            let assignedParticipant = null
            if (event?.status === 'active') {
              // Show participants in the first available slots (index order)
              assignedParticipant = participantStatuses[index] || null
            } else {
              // In other statuses, find participant assigned to this specific horse
              assignedParticipant = participantStatuses.find(p => p.horse_number === horse.number)
            }

            // Determine card state
            let cardState: 'paid' | 'pending' | 'available' = 'available'
            if (assignedParticipant) {
              cardState = assignedParticipant.has_paid ? 'paid' : 'pending'
            }

            // Card styling based on state
            const cardStyles = {
              paid: {
                border: '3px solid #00c950',
                background: '#f9fafb',
                numberColor: '#008236',
                nameColor: '#0d542b',
                badgeColor: '#00c950'
              },
              pending: {
                border: '3px solid #fe9a00',
                background: '#fef9f3',
                numberColor: '#bb4d00',
                nameColor: '#7b3306',
                badgeColor: '#fe9a00'
              },
              available: {
                border: '2px solid #d1d5dc',
                background: '#ffffff',
                numberColor: '#99a1af',
                nameColor: '#6a7282',
                badgeColor: '#d1d5dc'
              }
            }

            const style = cardStyles[cardState]

            // Check if this assignment is new
            const isNewAssignment = assignedParticipant?.assigned_at &&
              newAssignmentId &&
              assignments.find(a => a.id === newAssignmentId && a.event_horses?.number === horse.number)

            return (
              <div
                key={horse.id}
                className={`rounded-xl flex flex-col items-center justify-center p-4 transition-all duration-500 ${
                  isNewAssignment ? 'animate-pulse ring-4 ring-yellow-400 transform scale-105' : ''
                }`}
                style={{
                  border: style.border,
                  backgroundColor: style.background,
                  height: '140px'
                }}
              >
                {/* Horse Number */}
                <div
                  className="text-4xl font-bold mb-2"
                  style={{ color: style.numberColor }}
                >
                  {horse.number}
                </div>

                {cardState === 'available' ? (
                  <>
                    <div
                      className="text-2xl text-center mb-2"
                      style={{ color: style.nameColor }}
                    >
                      JOIN NOW
                    </div>
                    <ArrowRight className="w-5 h-5" style={{ color: style.nameColor }} />
                  </>
                ) : (
                  <>
                    {/* Participant Name */}
                    <div
                      className="text-2xl font-bold text-center uppercase mb-2 leading-tight"
                      style={{ color: style.nameColor }}
                    >
                      {assignedParticipant?.participant_name}
                    </div>

                    {/* Status Badge */}
                    <div
                      className="px-3 py-1 rounded-full flex items-center space-x-1"
                      style={{ backgroundColor: style.badgeColor }}
                    >
                      {cardState === 'paid' ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Clock className="w-4 h-4 text-white" />
                      )}
                      <span className="text-lg font-bold text-white">
                        {cardState === 'paid' ? 'PAID' : 'PENDING'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Section - 200px height */}
      <div className="h-[200px] bg-[#111111] flex">
        {/* Left: Recent Activity Feed */}
        <div className="flex-1 p-8">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-7 h-7 text-white" />
            <h3 className="text-3xl font-bold text-white">RECENT ACTIVITY</h3>
          </div>
          <div className="space-y-2">
            {footerActivity.length > 0 ? (
              footerActivity.map((activity, index) => (
                <div
                  key={index}
                  className="text-2xl text-white opacity-90"
                >
                  {activity}
                </div>
              ))
            ) : (
              <div className="text-2xl text-white opacity-75">
                Waiting for participants to join...
              </div>
            )}
          </div>
        </div>

        {/* Right: Prize Pool Display */}
        <div className="flex items-center justify-center p-8">
          <div
            className="w-[580px] h-[160px] rounded-2xl flex flex-col items-center justify-center border-4 border-white/30 shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, #ff8a00 0%, #ff4d8d 50%, #8b5cf6 100%)'
            }}
          >
            <p className="text-xl text-white font-bold tracking-wider mb-3 drop-shadow-lg">PRIZE POOL</p>
            <div className="text-7xl font-black text-white mb-2 text-shadow-strong">
              {entryFee === 0 ? 'FREE EVENT' : formatCurrency(prizePool)}
            </div>
            {entryFee > 0 ? (
<<<<<<< HEAD
              <div className="text-sm text-white opacity-70 text-center">
                <div>1st: {formatCurrency(firstPrize)} ({event?.first_place_percentage || 0}%) | 2nd: {formatCurrency(secondPrize)} ({event?.second_place_percentage || 0}%) | 3rd: {formatCurrency(thirdPrize)} ({event?.third_place_percentage || 0}%)</div>
                <div className="mt-1">{(event?.capacity || 0) - participants.length}/{event?.capacity || 0} spots remaining</div>
=======
              <div className="text-base text-white font-semibold text-center leading-tight px-4">
                <div className="bg-black/20 rounded-lg px-3 py-1">
                  1st: {formatCurrency(firstPrize)} ({event.first_place_percentage}%) • 2nd: {formatCurrency(secondPrize)} ({event.second_place_percentage}%) • 3rd: {formatCurrency(thirdPrize)} ({event.third_place_percentage}%)
                </div>
>>>>>>> fc2a5e1
              </div>
            ) : (
              <p className="text-lg text-white font-semibold bg-black/20 rounded-lg px-4 py-1">Free to enter!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Export the component wrapped in an error boundary
export default function LiveViewPageWithErrorBoundary() {
  console.log('[WRAPPER] LiveViewPageWithErrorBoundary executing')
  return (
    <ErrorBoundary>
      <LiveViewPage />
    </ErrorBoundary>
  )
}