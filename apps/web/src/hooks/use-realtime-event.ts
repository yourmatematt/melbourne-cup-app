'use client'

import { useRealtimeParticipants } from './use-realtime-participants'
import { useRealtimeAssignments } from './use-realtime-assignments'
import { useRealtimeEventStatus } from './use-realtime-event-status'

interface UseRealtimeEventOptions {
  includeParticipants?: boolean
  includeAssignments?: boolean
  includeEventStatus?: boolean
  includeStats?: boolean
  includeAssignmentRelations?: boolean
  onParticipantAdded?: (participant: any) => void
  onAssignmentAdded?: (assignment: any) => void
  onStatusChange?: (event: any, oldStatus: string) => void
  onError?: (error: any) => void
}

export function useRealtimeEvent(eventId: string, options: UseRealtimeEventOptions = {}) {
  const {
    includeParticipants = true,
    includeAssignments = true,
    includeEventStatus = true,
    includeStats = true,
    includeAssignmentRelations = true,
    ...callbacks
  } = options

  // Use individual hooks based on options
  const participantsHook = useRealtimeParticipants(
    eventId,
    includeParticipants
      ? {
          onParticipantAdded: callbacks.onParticipantAdded,
          onError: callbacks.onError
        }
      : { onError: () => {} }
  )

  const assignmentsHook = useRealtimeAssignments(
    eventId,
    includeAssignments
      ? {
          onAssignmentAdded: callbacks.onAssignmentAdded,
          onError: callbacks.onError,
          includeRelations: includeAssignmentRelations
        }
      : { onError: () => {} }
  )

  const eventStatusHook = useRealtimeEventStatus(
    eventId,
    includeEventStatus
      ? {
          onStatusChange: callbacks.onStatusChange,
          onError: callbacks.onError,
          includeStats
        }
      : { onError: () => {} }
  )

  // Combine loading states
  const loading = (
    (includeParticipants && participantsHook.loading) ||
    (includeAssignments && assignmentsHook.loading) ||
    (includeEventStatus && eventStatusHook.loading)
  )

  // Combine realtime states
  const realtimeState = {
    participants: includeParticipants ? participantsHook.realtimeState : null,
    assignments: includeAssignments ? assignmentsHook.realtimeState : null,
    eventStatus: includeEventStatus ? eventStatusHook.realtimeState : null,
    isConnected: [
      includeParticipants ? participantsHook.realtimeState.isConnected : true,
      includeAssignments ? assignmentsHook.realtimeState.isConnected : true,
      includeEventStatus ? eventStatusHook.realtimeState.isConnected : true
    ].every(Boolean),
    isReconnecting: [
      includeParticipants ? participantsHook.realtimeState.isReconnecting : false,
      includeAssignments ? assignmentsHook.realtimeState.isReconnecting : false,
      includeEventStatus ? eventStatusHook.realtimeState.isReconnecting : false
    ].some(Boolean),
    hasError: [
      includeParticipants ? !!participantsHook.realtimeState.error : false,
      includeAssignments ? !!assignmentsHook.realtimeState.error : false,
      includeEventStatus ? !!eventStatusHook.realtimeState.error : false
    ].some(Boolean),
    lastUpdated: [
      includeParticipants ? participantsHook.realtimeState.lastUpdated : null,
      includeAssignments ? assignmentsHook.realtimeState.lastUpdated : null,
      includeEventStatus ? eventStatusHook.realtimeState.lastUpdated : null
    ]
      .filter(Boolean)
      .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0] || null
  }

  // Refresh all data
  const refreshAll = () => {
    if (includeParticipants) participantsHook.refresh()
    if (includeAssignments) assignmentsHook.refresh()
    if (includeEventStatus) eventStatusHook.refresh()
  }

  // Reconnect all subscriptions
  const reconnectAll = () => {
    if (includeParticipants) participantsHook.reconnect()
    if (includeAssignments) assignmentsHook.reconnect()
    if (includeEventStatus) eventStatusHook.reconnect()
  }

  return {
    // Data
    participants: includeParticipants ? participantsHook.participants : [],
    assignments: includeAssignments ? assignmentsHook.assignments : [],
    event: includeEventStatus ? eventStatusHook.event : null,
    eventStats: includeEventStatus ? eventStatusHook.eventStats : null,

    // States
    loading,
    realtimeState,

    // Optimistic updates
    addParticipantOptimistic: includeParticipants ? participantsHook.addParticipantOptimistic : undefined,
    rollbackParticipantOptimistic: includeParticipants ? participantsHook.rollbackOptimistic : undefined,
    updateParticipantWithRealData: includeParticipants ? participantsHook.updateWithRealData : undefined,

    addAssignmentOptimistic: includeAssignments ? assignmentsHook.addAssignmentOptimistic : undefined,
    rollbackAssignmentOptimistic: includeAssignments ? assignmentsHook.rollbackOptimistic : undefined,
    updateAssignmentWithRealData: includeAssignments ? assignmentsHook.updateWithRealData : undefined,

    updateEventStatus: includeEventStatus ? eventStatusHook.updateEventStatus : undefined,
    updateStatusOptimistic: includeEventStatus ? eventStatusHook.updateStatusOptimistic : undefined,
    rollbackStatusOptimistic: includeEventStatus ? eventStatusHook.rollbackOptimisticStatus : undefined,

    // Actions
    refreshAll,
    reconnectAll
  }
}