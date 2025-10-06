import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CalcuttaLiveData {
  event: {
    id: string
    name: string
    starts_at: string
    status: 'draft' | 'active' | 'drawing' | 'racing' | 'completed' | 'cancelled'
    mode: 'calcutta' | 'sweep'
    tenants?: {
      id: string
      name: string
      brand_color_primary?: string
      brand_color_secondary?: string
      logo_url?: string
    }
  }
  assignments: Array<{
    horse_number: number
    patron_entries: {
      participant_name: string
      join_code: string
    }
    auction_price?: number
  }>
  results: Array<{
    place: number
    horse_number: number
    prize_amount: number
  }>
  prizePool: {
    total: number
    firstPlace: number
    secondPlace: number
    thirdPlace: number
  }
  raceStatus: 'pre-draw' | 'drawing-complete' | 'pre-race' | 'racing' | 'completed'
}

export interface ConnectionStatus {
  isConnected: boolean
  isReconnecting: boolean
  lastConnected?: Date
  errorCount: number
}

interface UseCalcuttaLiveUpdatesOptions {
  eventId: string
  enabled?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useCalcuttaLiveUpdates({
  eventId,
  enabled = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10
}: UseCalcuttaLiveUpdatesOptions) {
  const [data, setData] = useState<CalcuttaLiveData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isReconnecting: false,
    errorCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(`/api/events/${eventId}/calcutta-display`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load calcutta data')
      }

      setData(result.data)
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: true,
        lastConnected: new Date(),
        errorCount: 0
      }))
    } catch (err) {
      console.error('Error fetching calcutta data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        errorCount: prev.errorCount + 1
      }))
    } finally {
      setLoading(false)
    }
  }, [eventId])

  // Handle real-time updates
  useEffect(() => {
    if (!enabled || !eventId) return

    console.log(`🔄 Setting up calcutta live updates for event ${eventId}`)

    // Initial data fetch
    fetchData()

    // Set up real-time subscriptions
    const eventChannel = supabase
      .channel(`calcutta-event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        (payload) => {
          console.log('📺 Event status changed:', payload.new)
          // Refetch data when event status changes
          fetchData()
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
        (payload) => {
          console.log('🎯 Assignment changed:', payload)
          // Refetch data when assignments change (auction prices, new assignments)
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_results',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('🏆 Results updated:', payload)
          // Refetch data when race results change
          fetchData()
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)

        if (status === 'SUBSCRIBED') {
          setConnectionStatus(prev => ({
            ...prev,
            isConnected: true,
            isReconnecting: false,
            lastConnected: new Date()
          }))
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus(prev => ({
            ...prev,
            isConnected: false,
            errorCount: prev.errorCount + 1
          }))
        }
      })

    // Cleanup
    return () => {
      console.log(`🛑 Cleaning up calcutta subscriptions for event ${eventId}`)
      eventChannel.unsubscribe()
    }
  }, [enabled, eventId, fetchData, supabase])

  // Auto-reconnection logic
  useEffect(() => {
    if (!enabled || connectionStatus.isConnected || connectionStatus.isReconnecting) return
    if (connectionStatus.errorCount >= maxReconnectAttempts) return

    const timer = setTimeout(() => {
      console.log(`🔄 Attempting to reconnect... (attempt ${connectionStatus.errorCount + 1})`)
      setConnectionStatus(prev => ({ ...prev, isReconnecting: true }))
      fetchData()
    }, reconnectInterval)

    return () => clearTimeout(timer)
  }, [
    enabled,
    connectionStatus.isConnected,
    connectionStatus.isReconnecting,
    connectionStatus.errorCount,
    maxReconnectAttempts,
    reconnectInterval,
    fetchData
  ])

  // Manual refresh function
  const refresh = useCallback(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  // Force reconnect function
  const reconnect = useCallback(() => {
    setConnectionStatus({
      isConnected: false,
      isReconnecting: false,
      errorCount: 0
    })
    setError(null)
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    connectionStatus,
    refresh,
    reconnect
  }
}