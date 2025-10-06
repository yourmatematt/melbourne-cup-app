'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PatronJoinForm } from './patron-join-form'
import { ConfirmationScreen } from './confirmation-screen'
import { WaitingRoom } from './waiting-room'
import { SpectatorMode } from './spectator-mode'
import { RealtimeStatusIndicator } from '@/components/realtime/realtime-status-indicator'
import { RealtimeNotificationContainer, useRealtimeNotifications } from '@/components/realtime/realtime-notification'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { BrandingProvider, useBranding } from '@/contexts/branding-context'
import type { PatronJoinFormData } from '@/lib/patron-schemas'

interface PatronJoinExperienceProps {
  event: any
}

type JoinState = 'form' | 'confirmation' | 'waiting' | 'spectator'

function PatronJoinExperienceContent({ event }: PatronJoinExperienceProps) {
  const [state, setState] = useState<JoinState>('form')
  const [patronEntry, setPatronEntry] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { brandKit } = useBranding()

  // Realtime hooks
  const {
    participants,
    assignments,
    event: realtimeEvent,
    eventStats,
    loading: realtimeLoading,
    realtimeState,
    addParticipantOptimistic,
    rollbackParticipantOptimistic,
    updateParticipantWithRealData,
    refreshAll,
    reconnectAll
  } = useRealtimeEvent(event.id, {
    includeParticipants: true,
    includeAssignments: true,
    includeEventStatus: true,
    includeStats: true,
    onParticipantAdded: (participant) => {
      if (participant.id !== patronEntry?.id) {
        notifications.notifyParticipantAdded(participant)
      }
    },
    onAssignmentAdded: (assignment) => {
      const participant = participants.find(p => p.id === assignment.patron_entry_id)
      const horse = assignment.event_horse
      if (participant && horse) {
        notifications.notifyAssignmentCreated(participant, horse)
      }
    },
    onStatusChange: (event, oldStatus) => {
      notifications.notifyStatusChanged(oldStatus, event.status)
    }
  })

  const notifications = useRealtimeNotifications()

  // Check if event is full and should show spectator mode
  useEffect(() => {
    if (eventStats?.is_full && state === 'form') {
      setState('spectator')
    }
  }, [eventStats?.is_full, state])

  const handleJoinSubmit = async (data: PatronJoinFormData) => {
    setIsLoading(true)

    // Check if event is still accepting participants
    if (eventStats?.is_full) {
      setState('spectator')
      setIsLoading(false)
      return
    }

    // Generate join code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Optimistic update - add participant immediately
    const optimisticParticipant = {
      event_id: event.id,
      display_name: data.displayName,
      email: data.email || null,
      phone: data.phone || null,
      consent: data.marketingConsent,
      join_code: joinCode
    }

    const tempId = addParticipantOptimistic?.(optimisticParticipant)

    try {
      // Create patron entry
      const { data: entry, error } = await supabase
        .from('patron_entries')
        .insert(optimisticParticipant)
        .select()
        .single()

      if (error) {
        // Rollback optimistic update
        if (tempId) {
          rollbackParticipantOptimistic?.(tempId)
        }

        if (error.message?.includes('capacity')) {
          setState('spectator')
          setIsLoading(false)
          return
        }
        throw error
      }

      // Update with real data
      if (tempId) {
        updateParticipantWithRealData?.(tempId, entry)
      }

      setPatronEntry(entry)
      setState('confirmation')
    } catch (error) {
      // Rollback optimistic update on any error
      if (tempId) {
        rollbackParticipantOptimistic?.(tempId)
      }
      console.error('Error joining event:', error)
      // Handle error appropriately
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueToWaiting = () => {
    setState('waiting')
  }

  // Dynamic background based on branding
  const backgroundStyle = brandKit?.background_image_url
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), var(--brand-bg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }
    : {}

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 relative"
      style={backgroundStyle}
    >
      {/* Realtime Status Indicator */}
      <div className="fixed top-4 right-4 z-40">
        <RealtimeStatusIndicator
          realtimeState={realtimeState}
          onReconnect={reconnectAll}
          onRefresh={refreshAll}
          compact={true}
        />
      </div>

      {/* Realtime Notifications */}
      <RealtimeNotificationContainer
        notifications={notifications.notifications}
        onDismiss={notifications.dismissNotification}
        position="top-right"
        maxVisible={3}
      />

      {state === 'form' && (
        <PatronJoinForm
          event={realtimeEvent || event}
          eventStats={eventStats}
          onSubmit={handleJoinSubmit}
          isLoading={isLoading}
          participants={participants}
          realtimeState={realtimeState}
        />
      )}

      {state === 'confirmation' && patronEntry && (
        <ConfirmationScreen
          event={realtimeEvent || event}
          patronEntry={patronEntry}
          onContinue={handleContinueToWaiting}
        />
      )}

      {state === 'waiting' && patronEntry && (
        <WaitingRoom
          event={realtimeEvent || event}
          patronEntry={patronEntry}
          participants={participants}
          assignments={assignments}
          eventStats={eventStats}
          realtimeState={realtimeState}
        />
      )}

      {state === 'spectator' && (
        <SpectatorMode
          event={realtimeEvent || event}
          eventStats={eventStats}
          participants={participants}
          assignments={assignments}
          realtimeState={realtimeState}
        />
      )}
    </div>
  )
}

export function PatronJoinExperience({ event }: PatronJoinExperienceProps) {
  // Extract tenant ID from event or determine based on your data structure
  const tenantId = event.tenant_id || event.venue_id || 'default'

  return (
    <BrandingProvider tenantId={tenantId}>
      <PatronJoinExperienceContent event={event} />
    </BrandingProvider>
  )
}