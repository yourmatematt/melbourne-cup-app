'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNetworkResilience } from './use-network-resilience'

interface DrawStep {
  id: string
  type: 'participant_draw' | 'assignment_created' | 'draw_complete'
  participantId?: string
  horseId?: string
  drawOrder?: number
  timestamp: number
  retryCount?: number
}

interface DrawState {
  status: 'idle' | 'preparing' | 'drawing' | 'paused' | 'complete' | 'error'
  currentStep: number
  totalSteps: number
  steps: DrawStep[]
  participants: any[]
  horses: any[]
  assignments: any[]
  error?: string
  canResume: boolean
  lastCheckpoint?: number
}

interface DrawProgressSnapshot {
  eventId: string
  status: string
  currentStep: number
  totalSteps: number
  steps: DrawStep[]
  assignments: any[]
  timestamp: number
  checksum: string
}

interface UseDrawStateOptions {
  eventId: string
  onStepComplete?: (step: DrawStep) => void
  onDrawComplete?: (assignments: any[]) => void
  onError?: (error: string) => void
  onResume?: (fromStep: number) => void
  checkpointInterval?: number
}

export function useDrawState(options: UseDrawStateOptions) {
  const {
    eventId,
    onStepComplete,
    onDrawComplete,
    onError,
    onResume,
    checkpointInterval = 5000 // 5 seconds
  } = options

  const [drawState, setDrawState] = useState<DrawState>({
    status: 'idle',
    currentStep: 0,
    totalSteps: 0,
    steps: [],
    participants: [],
    horses: [],
    assignments: [],
    canResume: false
  })

  const supabase = createClient()
  const checkpointTimeoutRef = useRef<NodeJS.Timeout>()
  const drawProgressKey = `draw_progress_${eventId}`

  const { networkState, executeWithRetry, isConnected } = useNetworkResilience({
    maxAttempts: 5,
    onReconnect: () => {
      console.log('Network reconnected during draw')
      checkForResumableState()
    },
    onReconnectFailed: () => {
      setDrawState(prev => ({
        ...prev,
        status: 'error',
        error: 'Network connection could not be restored'
      }))
    }
  })

  const generateChecksum = useCallback((data: any): string => {
    return btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)
  }, [])

  const saveCheckpoint = useCallback(async (state: DrawState) => {
    try {
      const snapshot: DrawProgressSnapshot = {
        eventId,
        status: state.status,
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        steps: state.steps,
        assignments: state.assignments,
        timestamp: Date.now(),
        checksum: generateChecksum({ steps: state.steps, assignments: state.assignments })
      }

      // Save to localStorage for immediate recovery
      localStorage.setItem(drawProgressKey, JSON.stringify(snapshot))

      // Save to database for cross-device recovery
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('draw_checkpoints')
          .upsert({
            event_id: eventId,
            progress_data: snapshot,
            created_at: new Date().toISOString()
          })

        if (error) throw error
      }, { description: 'Save draw checkpoint' })

      console.log('Draw checkpoint saved:', state.currentStep, '/', state.totalSteps)
    } catch (error) {
      console.error('Failed to save draw checkpoint:', error)
    }
  }, [eventId, executeWithRetry, supabase, drawProgressKey, generateChecksum])

  const loadCheckpoint = useCallback(async (): Promise<DrawProgressSnapshot | null> => {
    try {
      // Try localStorage first
      const localData = localStorage.getItem(drawProgressKey)
      if (localData) {
        const snapshot = JSON.parse(localData) as DrawProgressSnapshot
        if (Date.now() - snapshot.timestamp < 300000) { // 5 minutes
          return snapshot
        }
      }

      // Fallback to database
      const { data, error } = await supabase
        .from('draw_checkpoints')
        .select('progress_data')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      return data.progress_data as DrawProgressSnapshot
    } catch (error) {
      console.error('Failed to load draw checkpoint:', error)
      return null
    }
  }, [eventId, supabase, drawProgressKey])

  const validateCheckpoint = useCallback((snapshot: DrawProgressSnapshot): boolean => {
    try {
      const expectedChecksum = generateChecksum({
        steps: snapshot.steps,
        assignments: snapshot.assignments
      })

      return snapshot.checksum === expectedChecksum &&
             snapshot.eventId === eventId &&
             snapshot.steps.length === snapshot.currentStep
    } catch (error) {
      console.error('Checkpoint validation failed:', error)
      return false
    }
  }, [eventId, generateChecksum])

  const checkForResumableState = useCallback(async () => {
    try {
      const checkpoint = await loadCheckpoint()

      if (!checkpoint || !validateCheckpoint(checkpoint)) {
        setDrawState(prev => ({ ...prev, canResume: false }))
        return
      }

      // Check if event is still in drawing state
      const { data: event, error } = await supabase
        .from('events')
        .select('status')
        .eq('id', eventId)
        .single()

      if (error || !event || event.status !== 'drawing') {
        setDrawState(prev => ({ ...prev, canResume: false }))
        return
      }

      // Verify assignments in database match checkpoint
      const { data: dbAssignments } = await supabase
        .from('assignments')
        .select('*')
        .eq('event_id', eventId)
        .order('draw_order')

      const dbCount = dbAssignments?.length || 0
      const checkpointCount = checkpoint.assignments.length

      if (dbCount === checkpointCount) {
        // Everything matches, can resume
        setDrawState(prev => ({
          ...prev,
          canResume: true,
          status: 'paused',
          currentStep: checkpoint.currentStep,
          totalSteps: checkpoint.totalSteps,
          steps: checkpoint.steps,
          assignments: checkpoint.assignments
        }))
      } else {
        console.warn('Database and checkpoint mismatch:', { dbCount, checkpointCount })
        setDrawState(prev => ({ ...prev, canResume: false }))
      }
    } catch (error) {
      console.error('Failed to check resumable state:', error)
      setDrawState(prev => ({ ...prev, canResume: false }))
    }
  }, [loadCheckpoint, validateCheckpoint, supabase, eventId])

  const initializeDraw = useCallback(async () => {
    try {
      setDrawState(prev => ({ ...prev, status: 'preparing' }))

      // Load participants and horses
      const [participantsResult, horsesResult] = await Promise.all([
        executeWithRetry(() => supabase
          .from('patron_entries')
          .select('*')
          .eq('event_id', eventId)
          .is('deleted_at', null), { description: 'Load participants' }),
        executeWithRetry(() => supabase
          .from('event_horses')
          .select('*')
          .eq('event_id', eventId)
          .eq('is_scratched', false)
          .order('number'), { description: 'Load horses' })
      ])

      if (participantsResult.error || horsesResult.error) {
        throw new Error('Failed to load draw data')
      }

      const participants = participantsResult.data || []
      const horses = horsesResult.data || []

      setDrawState(prev => ({
        ...prev,
        participants,
        horses,
        totalSteps: participants.length,
        status: 'drawing'
      }))

      return { participants, horses }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize draw'
      setDrawState(prev => ({ ...prev, status: 'error', error: errorMessage }))
      onError?.(errorMessage)
      throw error
    }
  }, [eventId, supabase, executeWithRetry, onError])

  const executeDrawStep = useCallback(async (step: DrawStep) => {
    try {
      const result = await executeWithRetry(async () => {
        if (step.type === 'assignment_created') {
          const { data, error } = await supabase
            .from('assignments')
            .insert({
              event_id: eventId,
              patron_entry_id: step.participantId,
              event_horse_id: step.horseId,
              draw_order: step.drawOrder,
              created_at: new Date().toISOString()
            })
            .select('*')
            .single()

          if (error) throw error
          return data
        }
        return null
      }, {
        retries: 5,
        description: `Draw step ${step.drawOrder}`
      })

      setDrawState(prev => {
        const newState = {
          ...prev,
          currentStep: prev.currentStep + 1,
          steps: [...prev.steps, { ...step, timestamp: Date.now() }],
          assignments: result ? [...prev.assignments, result] : prev.assignments
        }

        onStepComplete?.(step)
        return newState
      })

      return result
    } catch (error) {
      console.error('Draw step failed:', error)

      // Increment retry count
      const updatedStep = { ...step, retryCount: (step.retryCount || 0) + 1 }

      if (updatedStep.retryCount >= 3) {
        throw new Error(`Step failed after 3 retries: ${error}`)
      }

      // Retry the step
      return executeDrawStep(updatedStep)
    }
  }, [eventId, supabase, executeWithRetry, onStepComplete])

  const resumeFromCheckpoint = useCallback(async () => {
    try {
      const checkpoint = await loadCheckpoint()

      if (!checkpoint || !validateCheckpoint(checkpoint)) {
        throw new Error('Invalid or corrupted checkpoint')
      }

      setDrawState(prev => ({
        ...prev,
        status: 'drawing',
        currentStep: checkpoint.currentStep,
        totalSteps: checkpoint.totalSteps,
        steps: checkpoint.steps,
        assignments: checkpoint.assignments,
        canResume: false
      }))

      onResume?.(checkpoint.currentStep)
      console.log('Resumed draw from step:', checkpoint.currentStep)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume draw'
      setDrawState(prev => ({ ...prev, status: 'error', error: errorMessage }))
      onError?.(errorMessage)
    }
  }, [loadCheckpoint, validateCheckpoint, onResume, onError])

  const completeDraw = useCallback(async () => {
    try {
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('events')
          .update({ status: 'complete' })
          .eq('id', eventId)

        if (error) throw error
      }, { description: 'Complete draw' })

      setDrawState(prev => ({ ...prev, status: 'complete' }))

      // Clean up checkpoint
      localStorage.removeItem(drawProgressKey)

      onDrawComplete?.(drawState.assignments)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete draw'
      setDrawState(prev => ({ ...prev, status: 'error', error: errorMessage }))
      onError?.(errorMessage)
    }
  }, [eventId, supabase, executeWithRetry, drawProgressKey, drawState.assignments, onDrawComplete, onError])

  // Automatic checkpoint saving
  useEffect(() => {
    if (drawState.status === 'drawing' && drawState.currentStep > 0) {
      if (checkpointTimeoutRef.current) {
        clearTimeout(checkpointTimeoutRef.current)
      }

      checkpointTimeoutRef.current = setTimeout(() => {
        saveCheckpoint(drawState)
      }, checkpointInterval)
    }

    return () => {
      if (checkpointTimeoutRef.current) {
        clearTimeout(checkpointTimeoutRef.current)
      }
    }
  }, [drawState, saveCheckpoint, checkpointInterval])

  // Check for resumable state on mount
  useEffect(() => {
    checkForResumableState()
  }, [checkForResumableState])

  // Monitor network status
  useEffect(() => {
    if (!isConnected && drawState.status === 'drawing') {
      setDrawState(prev => ({ ...prev, status: 'paused' }))
    }
  }, [isConnected, drawState.status])

  return {
    drawState,
    networkState,
    isConnected,
    initializeDraw,
    executeDrawStep,
    resumeFromCheckpoint,
    completeDraw,
    canResume: drawState.canResume,
    saveCheckpoint: () => saveCheckpoint(drawState)
  }
}