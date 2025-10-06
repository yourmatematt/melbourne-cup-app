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

      const { data, error } = await query

      if (error) throw error

      setAssignments(data || [])
      setRealtimeState(prev => ({
        ...prev,
        error: null,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error loading assignments:', error)
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
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    setRealtimeState(prev => ({ ...prev, isReconnecting: true }))

    const channel = supabase.channel(`assignments_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assignments',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          let newAssignment = payload.new as Assignment

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
                .eq('id', newAssignment.id)
                .single()

              if (!error && data) {
                newAssignment = data
              }
            } catch (error) {
              console.error('Error fetching assignment relations:', error)
            }
          }

          setAssignments(prev => {
            // Check if we already have this assignment (avoid duplicates)
            if (prev.some(a => a.id === newAssignment.id)) {
              return prev
            }
            return [...prev, newAssignment]
          })

          setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
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
        console.log(`Assignments subscription status: ${status}`)

        setRealtimeState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
          isReconnecting: status === 'CHANNEL_ERROR' || status === 'TIMED_OUT',
          error: status === 'CHANNEL_ERROR' ? 'Connection error' : null
        }))

        // Handle reconnection
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect assignments subscription...')
            setupRealtimeSubscription()
          }, 3000)
        }
      })

    channelRef.current = channel
  }, [eventId, supabase])

  // Initial load and subscription setup
  useEffect(() => {
    if (!eventId) return

    loadAssignments()
    setupRealtimeSubscription()

    return () => {
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