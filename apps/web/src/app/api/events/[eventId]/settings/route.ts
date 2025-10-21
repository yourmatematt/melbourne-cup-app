import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface EventUpdateRequest {
  name?: string
  starts_at?: string
  timezone?: string
  capacity?: number
  mode?: 'sweep' | 'calcutta'
  lead_capture?: boolean
  description?: string
  // Payment fields not supported in current schema
  requires_payment?: boolean
  entry_fee?: number
  payment_timeout_minutes?: number
  promo_enabled?: boolean
  promo_message?: string
  promo_duration?: number
  custom_terms?: string
  custom_rules?: string
}

interface StatusUpdateRequest {
  status: 'active' | 'drawing' | 'completed' | 'cancelled'
  reason?: string
}

// GET - Fetch current event settings
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get event with all settings
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        tenants (
          id,
          name
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check user has access to this event
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', event.tenant_id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get participant count
    const { data: participants, error: participantsError } = await supabase
      .from('patron_entries')
      .select('id, payment_status')
      .eq('event_id', eventId)

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
    }

    const participantCount = participants?.length || 0
    const paidParticipants = participants?.filter(p => p.payment_status === 'paid').length || 0

    // Get assignments count
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id')
      .eq('event_id', eventId)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
    }

    const assignmentCount = assignments?.length || 0

    // Get results status
    const { data: results, error: resultsError } = await supabase
      .from('event_results')
      .select('id')
      .eq('event_id', eventId)

    if (resultsError) {
      console.error('Error fetching results:', resultsError)
    }

    const hasResults = (results?.length || 0) > 0

    return NextResponse.json({
      success: true,
      data: {
        event,
        stats: {
          participantCount,
          paidParticipants,
          assignmentCount,
          hasResults,
          canReduceCapacity: participantCount <= (event.capacity || 0),
          canDelete: participantCount === 0 || paidParticipants === 0
        }
      }
    })

  } catch (error) {
    console.error('Get event settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update event settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const updates: EventUpdateRequest = await request.json()

    console.log(`⚙️ Updating event settings for ${eventId}:`, updates)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current event for validation
    const { data: currentEvent, error: currentEventError } = await supabase
      .from('events')
      .select('*, tenant_id')
      .eq('id', eventId)
      .single()

    if (currentEventError || !currentEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check user has access
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', currentEvent.tenant_id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate updates
    const validationError = await validateEventUpdates(supabase, eventId, currentEvent, updates)
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      )
    }

    // Prepare update data - only include fields that exist in the current schema
    const allowedFields = ['name', 'starts_at', 'capacity', 'mode', 'lead_capture', 'description']
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Only include allowed fields that exist in the database schema
    allowedFields.forEach(field => {
      if (updates[field as keyof EventUpdateRequest] !== undefined) {
        updateData[field] = updates[field as keyof EventUpdateRequest]
      }
    })

    console.log('📝 Filtered update data:', updateData)

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('Event update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update event' },
        { status: 500 }
      )
    }

    console.log(`✅ Event settings updated successfully for ${eventId}`)

    // Broadcast update to realtime channels
    await supabase
      .channel(`event_${eventId}`)
      .send({
        type: 'broadcast',
        event: 'event_updated',
        payload: {
          eventId,
          updates: Object.keys(updateData),
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      data: {
        event: updatedEvent,
        message: 'Event settings updated successfully'
      }
    })

  } catch (error) {
    console.error('Update event settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update event status
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const { status, reason }: StatusUpdateRequest = await request.json()

    console.log(`🔄 Changing event status for ${eventId} to ${status}`)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current event
    const { data: currentEvent, error: currentEventError } = await supabase
      .from('events')
      .select('*, tenant_id')
      .eq('id', eventId)
      .single()

    if (currentEventError || !currentEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check user has access
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', currentEvent.tenant_id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate status transition
    const transitionError = await validateStatusTransition(supabase, eventId, currentEvent.status, status)
    if (transitionError) {
      return NextResponse.json(
        { success: false, error: transitionError },
        { status: 400 }
      )
    }

    // Update status
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('Status update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update status' },
        { status: 500 }
      )
    }

    console.log(`✅ Event status changed from ${currentEvent.status} to ${status}`)

    // Broadcast status change
    await supabase
      .channel(`event_${eventId}`)
      .send({
        type: 'broadcast',
        event: 'status_changed',
        payload: {
          eventId,
          oldStatus: currentEvent.status,
          newStatus: status,
          reason,
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      data: {
        event: updatedEvent,
        message: `Event status changed to ${status}`
      }
    })

  } catch (error) {
    console.error('Update event status error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const confirmationName = searchParams.get('confirm')

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get event for validation
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, tenant_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check user has access
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', event.tenant_id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate confirmation name
    if (confirmationName !== event.name) {
      return NextResponse.json(
        { success: false, error: 'Event name confirmation required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Deleting event ${eventId}: ${event.name}`)

    // Delete event (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('Event deletion error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete event' },
        { status: 500 }
      )
    }

    console.log(`✅ Event deleted successfully: ${event.name}`)

    return NextResponse.json({
      success: true,
      data: {
        message: `Event "${event.name}" has been permanently deleted`
      }
    })

  } catch (error) {
    console.error('Delete event error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Validation helpers
async function validateEventUpdates(
  supabase: any,
  eventId: string,
  currentEvent: any,
  updates: EventUpdateRequest
): Promise<string | null> {
  // Validate capacity reduction
  if (updates.capacity !== undefined && updates.capacity < currentEvent.capacity) {
    const { data: participants } = await supabase
      .from('patron_entries')
      .select('id')
      .eq('event_id', eventId)

    const participantCount = participants?.length || 0
    if (updates.capacity < participantCount) {
      return `Cannot reduce capacity to ${updates.capacity}. Currently have ${participantCount} participants.`
    }
  }

  // Validate date changes
  if (updates.starts_at) {
    const newDate = new Date(updates.starts_at)
    const now = new Date()

    // Allow past dates only for completed events
    if (newDate < now && currentEvent.status !== 'completed') {
      return 'Cannot set event date in the past for active events'
    }
  }

  // Validate entry fee changes
  if (updates.entry_fee !== undefined && updates.entry_fee !== currentEvent.entry_fee) {
    const { data: paidEntries } = await supabase
      .from('patron_entries')
      .select('id')
      .eq('event_id', eventId)
      .eq('payment_status', 'paid')

    if (paidEntries && paidEntries.length > 0) {
      return 'Cannot change entry fee after payments have been collected'
    }
  }

  // Validate name
  if (updates.name !== undefined && updates.name.trim().length < 3) {
    return 'Event name must be at least 3 characters'
  }

  return null
}

async function validateStatusTransition(
  supabase: any,
  eventId: string,
  currentStatus: string,
  newStatus: string
): Promise<string | null> {
  // Define allowed transitions
  const allowedTransitions: Record<string, string[]> = {
    active: ['drawing', 'completed', 'cancelled'],
    drawing: ['completed', 'active'],
    completed: [], // Completed events can't change status
    cancelled: ['active'] // Can reactivate cancelled events to active
  }

  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    return `Cannot change status from ${currentStatus} to ${newStatus}`
  }

  // Specific validations
  if (newStatus === 'active') {
    const { data: participants } = await supabase
      .from('patron_entries')
      .select('id')
      .eq('event_id', eventId)

    if (!participants || participants.length === 0) {
      return 'Cannot activate event without any participants'
    }
  }

  if (newStatus === 'completed') {
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('event_id', eventId)

    if (!assignments || assignments.length === 0) {
      return 'Cannot complete event without completing the draw'
    }
  }

  return null
}