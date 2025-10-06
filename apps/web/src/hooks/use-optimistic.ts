'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import { useToast } from '@/components/ui/use-toast'

interface OptimisticAction<T> {
  id: string
  type: string
  payload: T
  timestamp: number
}

interface OptimisticState<T> {
  data: T
  pendingActions: OptimisticAction<any>[]
  isLoading: boolean
}

interface UseOptimisticOptions {
  onError?: (error: Error, rollback: () => void) => void
  timeout?: number
  retryAttempts?: number
}

// Generic optimistic updates hook
export function useOptimistic<T>(
  initialData: T,
  options: UseOptimisticOptions = {}
) {
  const {
    onError,
    timeout = 30000, // 30 seconds
    retryAttempts = 3
  } = options

  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    pendingActions: [],
    isLoading: false
  })

  const [isPending, startTransition] = useTransition()
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const { toast } = useToast()

  // Apply optimistic update
  const applyOptimistic = useCallback((
    actionType: string,
    payload: any,
    optimisticUpdater: (current: T, payload: any) => T
  ) => {
    const actionId = `${actionType}_${Date.now()}_${Math.random().toString(36).substring(2)}`

    setState(prev => ({
      ...prev,
      data: optimisticUpdater(prev.data, payload),
      pendingActions: [...prev.pendingActions, {
        id: actionId,
        type: actionType,
        payload,
        timestamp: Date.now()
      }]
    }))

    return actionId
  }, [])

  // Commit optimistic update (success)
  const commitOptimistic = useCallback((actionId: string, serverData?: T) => {
    setState(prev => ({
      ...prev,
      data: serverData || prev.data,
      pendingActions: prev.pendingActions.filter(action => action.id !== actionId),
      isLoading: prev.pendingActions.length <= 1 ? false : prev.isLoading
    }))

    // Clear timeout
    const timeoutId = timeoutsRef.current.get(actionId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutsRef.current.delete(actionId)
    }
  }, [])

  // Rollback optimistic update (failure)
  const rollbackOptimistic = useCallback((actionId: string, rollbackUpdater: (current: T, action: OptimisticAction<any>) => T) => {
    setState(prev => {
      const action = prev.pendingActions.find(a => a.id === actionId)
      if (!action) return prev

      return {
        ...prev,
        data: rollbackUpdater(prev.data, action),
        pendingActions: prev.pendingActions.filter(a => a.id !== actionId),
        isLoading: prev.pendingActions.length <= 1 ? false : prev.isLoading
      }
    })

    // Clear timeout
    const timeoutId = timeoutsRef.current.get(actionId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutsRef.current.delete(actionId)
    }
  }, [])

  // Execute optimistic action with automatic rollback on failure
  const executeOptimistic = useCallback(async <P, R>(
    actionType: string,
    payload: P,
    optimisticUpdater: (current: T, payload: P) => T,
    serverAction: (payload: P) => Promise<R>,
    rollbackUpdater?: (current: T, action: OptimisticAction<P>) => T,
    serverDataUpdater?: (current: T, serverData: R) => T
  ): Promise<R> => {
    startTransition(() => {
      setState(prev => ({ ...prev, isLoading: true }))
    })

    // Apply optimistic update
    const actionId = applyOptimistic(actionType, payload, optimisticUpdater)

    // Set timeout for automatic rollback
    const timeoutId = setTimeout(() => {
      if (rollbackUpdater) {
        rollbackOptimistic(actionId, rollbackUpdater)
      }
      onError?.(new Error('Action timed out'), () => {
        if (rollbackUpdater) {
          rollbackOptimistic(actionId, rollbackUpdater)
        }
      })
    }, timeout)

    timeoutsRef.current.set(actionId, timeoutId)

    try {
      // Execute server action
      const result = await serverAction(payload)

      // Commit optimistic update with server data
      const finalData = serverDataUpdater ? serverDataUpdater(state.data, result) : undefined
      commitOptimistic(actionId, finalData)

      return result
    } catch (error) {
      // Rollback on error
      if (rollbackUpdater) {
        rollbackOptimistic(actionId, rollbackUpdater)
      }

      const errorMessage = error instanceof Error ? error.message : 'Action failed'

      // Show error toast
      toast({
        title: 'Action Failed',
        description: errorMessage,
        variant: 'destructive'
      })

      // Call error handler
      onError?.(error as Error, () => {
        if (rollbackUpdater) {
          rollbackOptimistic(actionId, rollbackUpdater)
        }
      })

      throw error
    } finally {
      startTransition(() => {
        setState(prev => ({ ...prev, isLoading: false }))
      })
    }
  }, [
    applyOptimistic,
    commitOptimistic,
    rollbackOptimistic,
    onError,
    timeout,
    toast,
    state.data
  ])

  // Retry failed action
  const retryAction = useCallback(async (actionId: string) => {
    const action = state.pendingActions.find(a => a.id === actionId)
    if (!action) return

    // Retry logic would be implemented here
    // This is a simplified version
    console.log('Retrying action:', action)
  }, [state.pendingActions])

  // Clear all pending actions (emergency reset)
  const clearPending = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
    timeoutsRef.current.clear()

    setState(prev => ({
      ...prev,
      pendingActions: [],
      isLoading: false
    }))
  }, [])

  return {
    data: state.data,
    pendingActions: state.pendingActions,
    isLoading: state.isLoading || isPending,
    executeOptimistic,
    retryAction,
    clearPending
  }
}

// Specialized hook for patron entries
export function useOptimisticPatrons(initialPatrons: any[] = []) {
  return useOptimistic(initialPatrons, {
    onError: (error, rollback) => {
      console.error('Patron action failed:', error)
      rollback()
    }
  })
}

// Specialized hook for event data
export function useOptimisticEvent(initialEvent: any) {
  return useOptimistic(initialEvent, {
    onError: (error, rollback) => {
      console.error('Event action failed:', error)
      rollback()
    }
  })
}

// Specialized hook for assignments
export function useOptimisticAssignments(initialAssignments: any[] = []) {
  return useOptimistic(initialAssignments, {
    onError: (error, rollback) => {
      console.error('Assignment action failed:', error)
      rollback()
    }
  })
}

// Hook for optimistic form submissions
export function useOptimisticForm<T>(
  onSubmit: (data: T) => Promise<any>,
  options: UseOptimisticOptions = {}
) {
  const [formState, setFormState] = useState<{
    isSubmitting: boolean
    isSuccess: boolean
    error: string | null
    data: T | null
  }>({
    isSubmitting: false,
    isSuccess: false,
    error: null,
    data: null
  })

  const [isPending, startTransition] = useTransition()

  const submitForm = useCallback(async (data: T) => {
    startTransition(() => {
      setFormState(prev => ({
        ...prev,
        isSubmitting: true,
        error: null,
        data
      }))
    })

    try {
      await onSubmit(data)

      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed'

      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage
      }))

      throw error
    }
  }, [onSubmit])

  const resetForm = useCallback(() => {
    setFormState({
      isSubmitting: false,
      isSuccess: false,
      error: null,
      data: null
    })
  }, [])

  return {
    ...formState,
    isLoading: formState.isSubmitting || isPending,
    submitForm,
    resetForm
  }
}

// Hook for optimistic list operations
export function useOptimisticList<T extends { id: string }>(
  initialItems: T[] = [],
  options: UseOptimisticOptions = {}
) {
  const {
    data: items,
    executeOptimistic,
    isLoading,
    pendingActions
  } = useOptimistic(initialItems, options)

  // Add item optimistically
  const addItem = useCallback((
    item: T,
    serverAction: (item: T) => Promise<T>
  ) => {
    return executeOptimistic(
      'ADD_ITEM',
      item,
      (current, newItem) => [...current, newItem],
      serverAction,
      (current, action) => current.filter(i => i.id !== action.payload.id),
      (current, serverItem) => current.map(i => i.id === item.id ? serverItem : i)
    )
  }, [executeOptimistic])

  // Update item optimistically
  const updateItem = useCallback((
    id: string,
    updates: Partial<T>,
    serverAction: (id: string, updates: Partial<T>) => Promise<T>
  ) => {
    return executeOptimistic(
      'UPDATE_ITEM',
      { id, updates },
      (current, { id, updates }) =>
        current.map(item => item.id === id ? { ...item, ...updates } : item),
      ({ id, updates }) => serverAction(id, updates),
      (current, action) => {
        const originalItem = current.find(i => i.id === action.payload.id)
        if (!originalItem) return current
        return current.map(i => i.id === action.payload.id ? originalItem : i)
      },
      (current, serverItem) => current.map(i => i.id === id ? serverItem : i)
    )
  }, [executeOptimistic])

  // Remove item optimistically
  const removeItem = useCallback((
    id: string,
    serverAction: (id: string) => Promise<void>
  ) => {
    const itemToRemove = items.find(item => item.id === id)

    return executeOptimistic(
      'REMOVE_ITEM',
      { id, item: itemToRemove },
      (current, { id }) => current.filter(item => item.id !== id),
      ({ id }) => serverAction(id),
      (current, action) => {
        if (action.payload.item) {
          return [...current, action.payload.item]
        }
        return current
      }
    )
  }, [executeOptimistic, items])

  return {
    items,
    isLoading,
    pendingActions,
    addItem,
    updateItem,
    removeItem
  }
}