'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Participant {
  id: string
  event_id: string
  participant_name: string
  email?: string
  phone?: string
  join_code: string
  consent: boolean
  created_at: string
  updated_at: string
}

interface UseRealtimeParticipantsOptions {
  onParticipantAdded?: (participant: Participant) => void
  onParticipantUpdated?: (participant: Participant) => void
  onParticipantRemoved?: (participantId: string) => void
  onError?: (error: any) => void
}

interface RealtimeState {
  isConnected: boolean
  isReconnecting: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useRealtimeParticipants(
  eventId: string,
  options: UseRealtimeParticipantsOptions = {}
) {
  const [participants, setParticipants] = useState<Participant[]>([])
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
  const isInitialLoadRef = useRef(true)
  const optionsRef = useRef(options)

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Load initial data
  const loadParticipants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('patron_entries')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setParticipants(data || [])
      setRealtimeState(prev => ({
        ...prev,
        error: null,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error loading participants:', error)
      setRealtimeState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load participants'
      }))
      optionsRef.current.onError?.(error)
    } finally {
      setLoading(false)
      isInitialLoadRef.current = false
    }
  }, [eventId, supabase])

  // Optimistic add participant
  const addParticipantOptimistic = useCallback((participant: Omit<Participant, 'id' | 'created_at' | 'updated_at'>) => {
    const optimisticParticipant: Participant = {
      ...participant,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setParticipants(prev => [...prev, optimisticParticipant])
    return optimisticParticipant.id
  }, [])

  // Rollback optimistic update
  const rollbackOptimistic = useCallback((tempId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== tempId))
  }, [])

  // Update participant with real data
  const updateWithRealData = useCallback((tempId: string, realParticipant: Participant) => {
    setParticipants(prev =>
      prev.map(p => p.id === tempId ? realParticipant : p)
    )
  }, [])

  // Setup realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    setRealtimeState(prev => ({ ...prev, isReconnecting: true }))

    const channel = supabase.channel(`participants_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patron_entries',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const newParticipant = payload.new as Participant

          setParticipants(prev => {
            // Check if we already have this participant (avoid duplicates)
            if (prev.some(p => p.id === newParticipant.id)) {
              return prev
            }
            return [...prev, newParticipant]
          })

          setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
          optionsRef.current.onParticipantAdded?.(newParticipant)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patron_entries',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const updatedParticipant = payload.new as Participant

          setParticipants(prev =>
            prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p)
          )

          setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
          optionsRef.current.onParticipantUpdated?.(updatedParticipant)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'patron_entries',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const deletedParticipant = payload.old as Participant

          setParticipants(prev => prev.filter(p => p.id !== deletedParticipant.id))
          setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
          optionsRef.current.onParticipantRemoved?.(deletedParticipant.id)
        }
      )
      .subscribe((status) => {
        console.log(`Participants subscription status: ${status}`)

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
            console.log('Attempting to reconnect participants subscription...')
            setupRealtimeSubscription()
          }, 3000)
        }
      })

    channelRef.current = channel
  }, [eventId, supabase])

  // Initial load and subscription setup
  useEffect(() => {
    if (!eventId) return

    loadParticipants()
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
    loadParticipants()
  }, [loadParticipants])

  // Reconnect function
  const reconnect = useCallback(() => {
    setupRealtimeSubscription()
  }, [setupRealtimeSubscription])

  return {
    participants,
    loading,
    realtimeState,
    addParticipantOptimistic,
    rollbackOptimistic,
    updateWithRealData,
    refresh,
    reconnect
  }
}