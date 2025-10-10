'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Assignment {
  id: string
  event_id: string
  patron_entry_id: string
  event_horse_id: string
  created_at: string
  updated_at: string
  event_horse?: any
  patron_entry?: any
}

interface UseRealtimeAssignmentsOptions {
  onAssignmentAdded?: (assignment: Assignment) => void
  onAssignmentUpdated?: (assignment: Assignment) => void
  onAssignmentRemoved?: (assignmentId: string) => void
  onError?: (error: any) => void
  includeRelations?: boolean
}

interface RealtimeState {
  isConnected: boolean
  isReconnecting: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useRealtimeAssignments(
  eventId: string,
  options: UseRealtimeAssignmentsOptions = {}
) {
  console.log('🚨 HOOK STARTING - useRealtimeAssignments called with eventId:', eventId)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    isConnected: false,
    isReconnecting: false,
    error: null,
    lastUpdated: null
  })

  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  // Store stable reference to options
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Load initial data
  const loadAssignments = useCallback(async () => {
    console.log('🔄 [HOOK] Loading assignments for eventId:', eventId)
    console.log('🔄 [HOOK] Include relations:', optionsRef.current.includeRelations)

    try {
      let query = supabase
        .from('assignments')
        .select(
          optionsRef.current.includeRelations
            ? `
                *,
                event_horses!event_horse_id(*),
                patron_entries!patron_entry_id(*)
              `
            : '*'
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      console.log('🔄 [HOOK] Executing assignments query...')
      const { data, error } = await query

      if (error) {
        console.error('❌ [HOOK] Query error:', error)
        throw error
      }

      console.log('✅ [HOOK] Assignments loaded:', {
        count: data?.length || 0,
        assignments: data?.map(a => ({
          id: a.id,
          event_id: a.event_id,
          patron_entry_id: a.patron_entry_id,
          event_horse_id: a.event_horse_id
        }))
      })

      setAssignments(data || [])
      setRealtimeState(prev => ({
        ...prev,
        error: null,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('❌ [HOOK] Error loading assignments:', error)
      setRealtimeState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load assignments'
      }))
      optionsRef.current.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [eventId, supabase])

  // Optimistic add assignment
  const addAssignmentOptimistic = useCallback((assignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>) => {
    const optimisticAssignment: Assignment = {
      ...assignment,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setAssignments(prev => [...prev, optimisticAssignment])
    return optimisticAssignment.id
  }, [])

  // Rollback optimistic update
  const rollbackOptimistic = useCallback((tempId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== tempId))
  }, [])

  // Update assignment with real data
  const updateWithRealData = useCallback((tempId: string, realAssignment: Assignment) => {
    setAssignments(prev =>
      prev.map(a => a.id === tempId ? realAssignment : a)
    )
  }, [])

  // Setup realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    console.log('🔌 [HOOK] Setting up realtime subscription for eventId:', eventId)

    if (channelRef.current) {
      console.log('🔌 [HOOK] Unsubscribing from existing channel')
      channelRef.current.unsubscribe()
    }

    setRealtimeState(prev => ({ ...prev, isReconnecting: true }))

    const channelName = `assignments_${eventId}`
    console.log('🔌 [HOOK] Creating channel:', channelName)
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assignments',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          console.log('🔥 [REALTIME] Assignment INSERT event received:', {
            eventId,
            payload,
            assignmentId: payload.new?.id,
            assignmentEventId: payload.new?.event_id,
            timestamp: new Date().toISOString()
          })

          let newAssignment = payload.new as Assignment

          // If we need relations, fetch them
          if (optionsRef.current.includeRelations) {
            console.log('🔗 [REALTIME] Fetching assignment relations for:', newAssignment.id)
            try {
              const { data, error } = await supabase
                .from('assignments')
                .select(`
                  *,
                  event_horses!event_horse_id(*),
                  patron_entries!patron_entry_id(*)
                `)
                .eq('id', newAssignment.id)
                .single()

              if (!error && data) {
                console.log('✅ [REALTIME] Assignment relations fetched:', data)
                newAssignment = data
              } else {
                console.error('❌ [REALTIME] Error fetching assignment relations:', error)
              }
            } catch (error) {
              console.error('❌ [REALTIME] Exception fetching assignment relations:', error)
            }
          }

          setAssignments(prev => {
            // Check if we already have this assignment (avoid duplicates)
            if (prev.some(a => a.id === newAssignment.id)) {
              console.log('⚠️ [REALTIME] Assignment already exists, skipping:', newAssignment.id)
              return prev
            }
            console.log('✅ [REALTIME] Adding new assignment to state:', {
              id: newAssignment.id,
              previousCount: prev.length,
              newCount: prev.length + 1
            })
            return [...prev, newAssignment]
          })

          setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
          console.log('📞 [REALTIME] Calling onAssignmentAdded callback')
          optionsRef.current.onAssignmentAdded?.(newAssignment)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assignments',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          let updatedAssignment = payload.new as Assignment

          // If we need relations, fetch them
          if (optionsRef.current.includeRelations) {
            try {
              const { data, error } = await supabase
                .from('assignments')
                .select(`
                  *,
                  event_horses!event_horse_id(*),
                  patron_entries!patron_entry_id(*)
                `)
                .eq('id', updatedAssignment.id)
                .single()

              if (!error && data) {
                updatedAssignment = data
              }
            } catch (error) {
              console.error('Error fetching assignment relations:', error)
            }
          }

          setAssignments(prev =>
            prev.map(a => a.id === updatedAssignment.id ? updatedAssignment : a)
          )

          setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
          optionsRef.current.onAssignmentUpdated?.(updatedAssignment)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'assignments',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const deletedAssignment = payload.old as Assignment

          setAssignments(prev => prev.filter(a => a.id !== deletedAssignment.id))
          setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
          optionsRef.current.onAssignmentRemoved?.(deletedAssignment.id)
        }
      )
      .subscribe((status) => {
        console.log(`🔌 [REALTIME] Assignments subscription status: ${status} for eventId: ${eventId}`)
        console.log(`🔌 [REALTIME] Channel name: assignments_${eventId}`)
        console.log(`🔌 [REALTIME] Filter: event_id=eq.${eventId}`)
        console.log(`🔌 [REALTIME] Timestamp: ${new Date().toISOString()}`)

        setRealtimeState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
          isReconnecting: status === 'CHANNEL_ERROR' || status === 'TIMED_OUT',
          error: status === 'CHANNEL_ERROR' ? 'Connection error' : null
        }))

        // Handle reconnection
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log(`❌ [REALTIME] Connection issue detected: ${status}`)
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 [REALTIME] Attempting to reconnect assignments subscription...')
            setupRealtimeSubscription()
          }, 3000)
        }

        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Successfully subscribed to assignments updates!')
        }
      })

    channelRef.current = channel
  }, [eventId, supabase])

  // Initial load and subscription setup
  useEffect(() => {
    if (!eventId) {
      console.log('⚠️ [HOOK] No eventId provided, skipping setup')
      return
    }

    console.log('🚀 [HOOK] Setting up assignments hook for eventId:', eventId)
    loadAssignments()
    setupRealtimeSubscription()

    return () => {
      console.log('🧹 [HOOK] Cleaning up assignments hook for eventId:', eventId)
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [eventId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  // Manual refresh function
  const refresh = useCallback(() => {
    loadAssignments()
  }, [loadAssignments])

  // Reconnect function
  const reconnect = useCallback(() => {
    setupRealtimeSubscription()
  }, [setupRealtimeSubscription])

  return {
    assignments,
    loading,
    realtimeState,
    addAssignmentOptimistic,
    rollbackOptimistic,
    updateWithRealData,
    refresh,
    reconnect
  }
}