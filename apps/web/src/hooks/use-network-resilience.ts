'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NetworkState {
  isOnline: boolean
  isReconnecting: boolean
  lastDisconnectTime: number | null
  reconnectAttempts: number
  maxReconnectAttempts: number
}

interface ReconnectionOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  exponentialBackoff?: boolean
  onReconnect?: () => void
  onReconnectFailed?: () => void
  onStatusChange?: (state: NetworkState) => void
}

interface NetworkResilienceHook {
  networkState: NetworkState
  isConnected: boolean
  executeWithRetry: <T>(
    operation: () => Promise<T>,
    options?: { retries?: number; description?: string }
  ) => Promise<T>
  reconnect: () => Promise<boolean>
  reset: () => void
}

export function useNetworkResilience(options: ReconnectionOptions = {}): NetworkResilienceHook {
  const {
    maxAttempts = 5,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBackoff = true,
    onReconnect,
    onReconnectFailed,
    onStatusChange
  } = options

  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isReconnecting: false,
    lastDisconnectTime: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: maxAttempts
  })

  const supabase = createClient()
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout>()
  const operationQueueRef = useRef<Array<() => Promise<void>>>([])

  const updateNetworkState = useCallback((updates: Partial<NetworkState>) => {
    setNetworkState(prev => {
      const newState = { ...prev, ...updates }
      onStatusChange?.(newState)
      return newState
    })
  }, [onStatusChange])

  const calculateDelay = useCallback((attempt: number): number => {
    if (!exponentialBackoff) return baseDelay

    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay
    return delay + jitter
  }, [baseDelay, maxDelay, exponentialBackoff])

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Test Supabase connection
      const { error } = await supabase.from('events').select('id').limit(1)
      return !error
    } catch (error) {
      console.warn('Connection test failed:', error)
      return false
    }
  }, [supabase])

  const reconnect = useCallback(async (): Promise<boolean> => {
    if (networkState.isReconnecting) return false

    updateNetworkState({ isReconnecting: true })

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      updateNetworkState({ reconnectAttempts: attempt + 1 })

      try {
        const isConnected = await testConnection()

        if (isConnected) {
          updateNetworkState({
            isOnline: true,
            isReconnecting: false,
            reconnectAttempts: 0,
            lastDisconnectTime: null
          })

          onReconnect?.()

          // Process queued operations
          const queuedOperations = [...operationQueueRef.current]
          operationQueueRef.current = []

          for (const operation of queuedOperations) {
            try {
              await operation()
            } catch (error) {
              console.error('Failed to execute queued operation:', error)
            }
          }

          return true
        }
      } catch (error) {
        console.warn(`Reconnection attempt ${attempt + 1} failed:`, error)
      }

      if (attempt < maxAttempts - 1) {
        const delay = calculateDelay(attempt)
        await new Promise(resolve => {
          reconnectionTimeoutRef.current = setTimeout(resolve, delay)
        })
      }
    }

    updateNetworkState({ isReconnecting: false })
    onReconnectFailed?.()
    return false
  }, [networkState.isReconnecting, maxAttempts, updateNetworkState, testConnection, onReconnect, onReconnectFailed, calculateDelay])

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    retryOptions: { retries?: number; description?: string } = {}
  ): Promise<T> => {
    const { retries = 3, description = 'Operation' } = retryOptions

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Check if we're online before attempting
        if (!networkState.isOnline && !networkState.isReconnecting) {
          const reconnected = await reconnect()
          if (!reconnected) {
            throw new Error('Network connection could not be established')
          }
        }

        const result = await operation()
        return result
      } catch (error) {
        const isNetworkError = error instanceof Error && (
          error.message.includes('network') ||
          error.message.includes('fetch') ||
          error.message.includes('offline') ||
          error.message.includes('timeout')
        )

        if (isNetworkError) {
          updateNetworkState({
            isOnline: false,
            lastDisconnectTime: Date.now()
          })

          // Queue operation for retry after reconnection
          if (attempt === retries) {
            operationQueueRef.current.push(async () => {
              try {
                await operation()
                console.log(`Queued ${description} executed successfully after reconnection`)
              } catch (retryError) {
                console.error(`Queued ${description} failed after reconnection:`, retryError)
              }
            })
          }
        }

        if (attempt === retries) {
          console.error(`${description} failed after ${retries + 1} attempts:`, error)
          throw error
        }

        // Wait before retrying
        const delay = calculateDelay(attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error(`${description} failed after all retry attempts`)
  }, [networkState.isOnline, networkState.isReconnecting, reconnect, updateNetworkState, calculateDelay])

  const reset = useCallback(() => {
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current)
    }

    operationQueueRef.current = []

    updateNetworkState({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isReconnecting: false,
      lastDisconnectTime: null,
      reconnectAttempts: 0
    })
  }, [updateNetworkState])

  // Monitor browser online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      updateNetworkState({ isOnline: true })
      if (networkState.lastDisconnectTime) {
        reconnect()
      }
    }

    const handleOffline = () => {
      updateNetworkState({
        isOnline: false,
        lastDisconnectTime: Date.now()
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Test connection on mount
    testConnection().then(isConnected => {
      if (!isConnected && networkState.isOnline) {
        updateNetworkState({
          isOnline: false,
          lastDisconnectTime: Date.now()
        })
      }
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current)
      }
    }
  }, [reconnect, testConnection, updateNetworkState, networkState.isOnline, networkState.lastDisconnectTime])

  return {
    networkState,
    isConnected: networkState.isOnline && !networkState.isReconnecting,
    executeWithRetry,
    reconnect,
    reset
  }
}