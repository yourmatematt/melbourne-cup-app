'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Event {
  id: string
  name: string
  slug: string
  status: 'draft' | 'lobby' | 'drawing' | 'complete'
  mode: 'standard' | 'premium'
  capacity: number
  starts_at: string
  created_at: string
  updated_at: string
  tenant_id: string
  tenant?: any
  brand_kit?: any
}

interface EventStats {
  total_entries: number
  total_assignments: number
  available_horses: number
  completion_percentage: number
}

interface UseRealtimeEventStatusOptions {
  onStatusChange?: (event: Event, oldStatus: string) => void
  onStatsUpdate?: (stats: EventStats) => void
  onError?: (error: any) => void
  includeStats?: boolean
}

interface RealtimeState {
  isConnected: boolean
  isReconnecting: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useRealtimeEventStatus(
  eventId: string,
  options: UseRealtimeEventStatusOptions = {}
) {
  const [event, setEvent] = useState<Event | null>(null)
  const [eventStats, setEventStats] = useState<EventStats | null>(null)
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
  const previousStatusRef = useRef<string>('')

  // Store stable reference to options
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Load initial data
  const loadEventData = useCallback(async () => {
    try {
      // Load event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          tenants!tenant_id(*)
        `)
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError

      const oldStatus = previousStatusRef.current
      previousStatusRef.current = eventData.status

      setEvent(eventData)

      // Trigger status change callback if status changed
      if (oldStatus && oldStatus !== eventData.status && optionsRef.current.onStatusChange) {
        optionsRef.current.onStatusChange(eventData, oldStatus)
      }

      // Load stats if requested
      if (optionsRef.current.includeStats) {
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_event_stats', { event_uuid: eventId })

        if (!statsError && statsData?.[0]) {
          setEventStats(statsData[0])
          optionsRef.current.onStatsUpdate?.(statsData[0])
        }
      }

      setRealtimeState(prev => ({
        ...prev,
        error: null,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error loading event data:', error)
      setRealtimeState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load event data'
      }))
      optionsRef.current.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [eventId, supabase])

  // Update event status optimistically
  const updateStatusOptimistic = useCallback((newStatus: Event['status']) => {
    if (!event) return null

    const previousEvent = { ...event }
    setEvent(prev => prev ? { ...prev, status: newStatus } : null)
    return previousEvent
  }, [event])

  // Rollback optimistic update
  const rollbackOptimisticStatus = useCallback((previousEvent: Event) => {
    setEvent(previousEvent)
  }, [])

  // Setup realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    setRealtimeState(prev => ({ ...prev, isReconnecting: true }))

    const channel = supabase.channel(`event_status_${eventId}`)
      // Subscribe to event changes
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        async (payload) => {
          const updatedEvent = payload.new as Event

          // Fetch full event with relations
          try {
            const { data, error } = await supabase
              .from('events')
              .select(`
                *,
                tenants!tenant_id(*)
              `)
              .eq('id', eventId)
              .single()

            if (!error && data) {
              const oldStatus = event?.status || ''
              setEvent(data)
              previousStatusRef.current = data.status

              // Trigger status change callback
              if (oldStatus !== data.status && optionsRef.current.onStatusChange) {
                optionsRef.current.onStatusChange(data, oldStatus)
              }
            }
          } catch (error) {
            console.error('Error fetching updated event:', error)
          }

          setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
        }
      )

    // If stats are enabled, also subscribe to changes that affect stats
    if (optionsRef.current.includeStats) {
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'patron_entries',
            filter: `event_id=eq.${eventId}`
          },
          async () => {
            // Refresh stats when participants change
            try {
              const { data: statsData, error } = await supabase
                .rpc('get_event_stats', { event_uuid: eventId })

              if (!error && statsData?.[0]) {
                setEventStats(statsData[0])
                optionsRef.current.onStatsUpdate?.(statsData[0])
              }
            } catch (error) {
              console.error('Error updating stats:', error)
            }

            setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assignments',
            filter: `event_id=eq.${eventId}`
          },
          async () => {
            // Refresh stats when assignments change
            try {
              const { data: statsData, error } = await supabase
                .rpc('get_event_stats', { event_uuid: eventId })

              if (!error && statsData?.[0]) {
                setEventStats(statsData[0])
                optionsRef.current.onStatsUpdate?.(statsData[0])
              }
            } catch (error) {
              console.error('Error updating stats:', error)
            }

            setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }))
          }
        )
    }

    channel.subscribe((status) => {
      console.log(`Event status subscription status: ${status}`)

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
          console.log('Attempting to reconnect event status subscription...')
          setupRealtimeSubscription()
        }, 3000)
      }
    })

    channelRef.current = channel
  }, [eventId, supabase])

  // Initial load and subscription setup
  useEffect(() => {
    if (!eventId) return

    loadEventData()
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
    loadEventData()
  }, [loadEventData])

  // Reconnect function
  const reconnect = useCallback(() => {
    setupRealtimeSubscription()
  }, [setupRealtimeSubscription])

  // Update event status
  const updateEventStatus = useCallback(async (newStatus: Event['status']) => {
    if (!event) return

    const previousEvent = updateStatusOptimistic(newStatus)

    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId)

      if (error) throw error

      // Success - the realtime subscription will handle the update
    } catch (error) {
      // Rollback on error
      if (previousEvent) {
        rollbackOptimisticStatus(previousEvent)
      }
      console.error('Error updating event status:', error)
      options.onError?.(error)
      throw error
    }
  }, [event, eventId, supabase, updateStatusOptimistic, rollbackOptimisticStatus, options])

  return {
    event,
    eventStats,
    loading,
    realtimeState,
    updateEventStatus,
    updateStatusOptimistic,
    rollbackOptimisticStatus,
    refresh,
    reconnect
  }
}