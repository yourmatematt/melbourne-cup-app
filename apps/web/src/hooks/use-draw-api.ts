'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DrawOptions {
  seed?: string
  skipScratched?: boolean
  dryRun?: boolean
}

interface UndoOptions {
  count?: number
  reason?: string
}

interface DrawStats {
  totalParticipants: number
  totalHorses: number
  assignmentsCreated: number
  seed: string
}

interface Assignment {
  id: string
  patron_entry_id: string
  event_horse_id: string
  draw_order: number
  created_at: string
  patron_entry: {
    participant_name: string
    email?: string
  }
  event_horse: {
    number: number
    name: string
    jockey: string
  }
}

interface DrawResult {
  success: boolean
  assignments?: Assignment[]
  auditLogId?: string
  skippedHorses?: number[]
  stats?: DrawStats
  error?: string
}

interface UndoResult {
  success: boolean
  deletedCount?: number
  auditLogId?: string
  eventStatusReset?: boolean
  remainingAssignments?: number
  error?: string
}

interface DrawStatus {
  success: boolean
  assignments: Assignment[]
  hasDrawn: boolean
  auditLogs: any[]
}

interface UndoStatus {
  success: boolean
  undoableAssignments: number
  lastAssignments: Assignment[]
  undoHistory: any[]
  canUndo: boolean
}

export function useDrawApi(eventId: string) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [lastDrawResult, setLastDrawResult] = useState<DrawResult | null>(null)
  const [lastUndoResult, setLastUndoResult] = useState<UndoResult | null>(null)
  const supabase = createClient()

  // Execute draw
  const executeDraw = useCallback(async (options: DrawOptions = {}): Promise<DrawResult> => {
    setIsExecuting(true)
    setLastDrawResult(null)

    try {
      const response = await fetch(`/api/events/${eventId}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seed: options.seed,
          skipScratched: options.skipScratched ?? true,
          dryRun: options.dryRun ?? false
        })
      })

      const result: DrawResult = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      setLastDrawResult(result)
      return result

    } catch (error) {
      const errorResult: DrawResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute draw'
      }
      setLastDrawResult(errorResult)
      return errorResult
    } finally {
      setIsExecuting(false)
    }
  }, [eventId])

  // Undo draw
  const undoDraw = useCallback(async (options: UndoOptions = {}): Promise<UndoResult> => {
    setIsUndoing(true)
    setLastUndoResult(null)

    try {
      const response = await fetch(`/api/events/${eventId}/draw/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: options.count,
          reason: options.reason
        })
      })

      const result: UndoResult = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      setLastUndoResult(result)
      return result

    } catch (error) {
      const errorResult: UndoResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo draw'
      }
      setLastUndoResult(errorResult)
      return errorResult
    } finally {
      setIsUndoing(false)
    }
  }, [eventId])

  // Get draw status
  const getDrawStatus = useCallback(async (): Promise<DrawStatus | null> => {
    try {
      const response = await fetch(`/api/events/${eventId}/draw`)
      const result: DrawStatus = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Failed to get draw status:', error)
      return null
    }
  }, [eventId])

  // Get undo status
  const getUndoStatus = useCallback(async (): Promise<UndoStatus | null> => {
    try {
      const response = await fetch(`/api/events/${eventId}/draw/undo`)
      const result: UndoStatus = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Failed to get undo status:', error)
      return null
    }
  }, [eventId])

  // Dry run draw (test without committing)
  const dryRunDraw = useCallback(async (options: Omit<DrawOptions, 'dryRun'> = {}) => {
    return executeDraw({ ...options, dryRun: true })
  }, [executeDraw])

  // Subscribe to realtime draw events
  const subscribeToDrawEvents = useCallback((
    onDrawCompleted?: (payload: any) => void,
    onDrawUndone?: (payload: any) => void
  ) => {
    const channel = supabase
      .channel(`event_${eventId}_draw`)
      .on(
        'broadcast',
        { event: 'draw_completed' },
        (payload) => {
          onDrawCompleted?.(payload)
        }
      )
      .on(
        'broadcast',
        { event: 'draw_undone' },
        (payload) => {
          onDrawUndone?.(payload)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId, supabase])

  return {
    // State
    isExecuting,
    isUndoing,
    lastDrawResult,
    lastUndoResult,

    // Actions
    executeDraw,
    undoDraw,
    dryRunDraw,

    // Queries
    getDrawStatus,
    getUndoStatus,

    // Realtime
    subscribeToDrawEvents
  }
}

// Utility functions for draw validation
export const drawValidation = {
  validateSeed: (seed: string): boolean => {
    return seed.length >= 8 && seed.length <= 64
  },

  generateSecureSeed: (): string => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  },

  estimateDrawTime: (participantCount: number): number => {
    // Rough estimate: ~10ms per participant for processing
    return Math.max(1000, participantCount * 10)
  }
}

// Hook for managing draw state across components
export function useDrawState(eventId: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [hasDrawn, setHasDrawn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const drawApi = useDrawApi(eventId)

  const refreshDrawState = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const status = await drawApi.getDrawStatus()
      if (status) {
        setAssignments(status.assignments)
        setHasDrawn(status.hasDrawn)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draw state')
    } finally {
      setIsLoading(false)
    }
  }, [drawApi])

  // Subscribe to draw events and refresh state
  const subscribeToDrawUpdates = useCallback(() => {
    return drawApi.subscribeToDrawEvents(
      () => refreshDrawState(), // On draw completed
      () => refreshDrawState()  // On draw undone
    )
  }, [drawApi, refreshDrawState])

  return {
    assignments,
    hasDrawn,
    isLoading,
    error,
    refreshDrawState,
    subscribeToDrawUpdates,
    drawApi
  }
}