import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH - Mark a prize as collected
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string, resultId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId, resultId } = params

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate event exists and user has access (RLS will handle tenant isolation)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, tenant_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this event
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

    // Update the result to mark as collected
    const { data: updatedResult, error: updateError } = await supabase
      .from('event_results')
      .update({
        collected: true,
        collected_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .eq('event_id', eventId) // Ensure result belongs to this event
      .select(`
        id,
        place,
        event_horse_id,
        patron_entry_id,
        prize_amount,
        collected,
        collected_at,
        patron_entries!patron_entry_id (
          participant_name
        ),
        event_horses!event_horse_id (
          number,
          name
        )
      `)
      .single()

    if (updateError || !updatedResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to update collection status' },
        { status: 500 }
      )
    }

    console.log(`✅ Prize collected for event ${eventId}, result ${resultId}`)

    return NextResponse.json({
      success: true,
      data: {
        result: updatedResult
      }
    })

  } catch (error) {
    console.error('Collection API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}