import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SaveResultsRequest {
  first: string  // event_horse_id
  second: string // event_horse_id
  third: string  // event_horse_id
  prizePool: number
}

// POST - Save race results and identify winners
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const body: SaveResultsRequest = await request.json()
    const { first, second, third, prizePool } = body

    console.log(`🏁 Results API: Saving results for event ${eventId}`, { first, second, third, prizePool })

    // Validate request
    if (!first || !second || !third || !prizePool || prizePool <= 0) {
      return NextResponse.json(
        { success: false, error: 'First, second, third place horses and prize pool are required' },
        { status: 400 }
      )
    }

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
      .select('id, name, status, tenant_id')
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

    // Get patron assignments for the winning horses
    const winningHorseIds = [first, second, third]
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        event_horse_id,
        patron_entry_id,
        patron_entries!patron_entry_id (
          participant_name
        ),
        event_horses!event_horse_id (
          number,
          name
        )
      `)
      .eq('event_id', eventId)
      .in('event_horse_id', winningHorseIds)

    if (assignmentsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch horse assignments' },
        { status: 500 }
      )
    }

    // Calculate prize amounts: 60% first, 25% second, 15% third
    const firstPrize = Math.round(prizePool * 0.6)
    const secondPrize = Math.round(prizePool * 0.25)
    const thirdPrize = Math.round(prizePool * 0.15)

    // Create assignment lookups
    const assignmentLookup = new Map()
    assignments?.forEach(assignment => {
      assignmentLookup.set(assignment.event_horse_id, assignment.patron_entry_id)
    })

    // Delete existing results for this event
    const { error: deleteError } = await supabase
      .from('event_results')
      .delete()
      .eq('event_id', eventId)

    if (deleteError) {
      console.error('Error deleting existing results:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to clear existing results' },
        { status: 500 }
      )
    }

    // Insert new results
    const resultsToInsert = [
      {
        event_id: eventId,
        place: 1,
        event_horse_id: first,
        patron_entry_id: assignmentLookup.get(first) || null,
        prize_amount: firstPrize,
        collected: false
      },
      {
        event_id: eventId,
        place: 2,
        event_horse_id: second,
        patron_entry_id: assignmentLookup.get(second) || null,
        prize_amount: secondPrize,
        collected: false
      },
      {
        event_id: eventId,
        place: 3,
        event_horse_id: third,
        patron_entry_id: assignmentLookup.get(third) || null,
        prize_amount: thirdPrize,
        collected: false
      }
    ]

    const { data: insertedResults, error: insertError } = await supabase
      .from('event_results')
      .insert(resultsToInsert)
      .select(`
        id,
        place,
        event_horse_id,
        patron_entry_id,
        prize_amount,
        collected,
        collected_at,
        created_at,
        patron_entries!patron_entry_id (
          participant_name
        ),
        event_horses!event_horse_id (
          number,
          name
        )
      `)

    if (insertError) {
      console.error('Error inserting results:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save results' },
        { status: 500 }
      )
    }

    // Update event status to completed
    const { error: eventUpdateError } = await supabase
      .from('events')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)

    if (eventUpdateError) {
      console.error('Error updating event status:', eventUpdateError)
    }

    console.log(`✅ Results saved successfully for event ${eventId}`, {
      resultsCount: insertedResults?.length || 0,
      totalPrizePool: prizePool
    })

    return NextResponse.json({
      success: true,
      data: {
        results: insertedResults,
        prizePool,
        event: {
          id: event.id,
          name: event.name,
          status: 'completed'
        }
      }
    })

  } catch (error) {
    console.error('Results API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Retrieve current results for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params

    // Get event details (RLS will handle tenant isolation)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, starts_at')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get current results with joined patron and horse data
    const { data: results, error: resultsError } = await supabase
      .from('event_results')
      .select(`
        id,
        place,
        event_horse_id,
        patron_entry_id,
        prize_amount,
        collected,
        collected_at,
        created_at,
        patron_entries!patron_entry_id (
          participant_name
        ),
        event_horses!event_horse_id (
          number,
          name
        )
      `)
      .eq('event_id', eventId)
      .order('place', { ascending: true })

    if (resultsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          status: event.status,
          starts_at: event.starts_at
        },
        results: results || []
      }
    })

  } catch (error) {
    console.error('Get results API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

