import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SaveResultsRequest {
  results: Array<{
    place: number
    horseNumber: number
    prizeAmount: number
  }>
  finalize?: boolean
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
    const { results, finalize = false } = body

    console.log(`🏁 Results API: Saving results for event ${eventId}`, { results, finalize })

    // Validate request
    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Results array is required' },
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

    // Prepare results to insert
    const resultsToInsert = results.map(result => ({
      event_id: eventId,
      place: result.place,
      horse_number: result.horseNumber,
      prize_amount: result.prizeAmount || 0,
      collected: false
    }))

    const { data: insertedResults, error: insertError } = await supabase
      .from('event_results')
      .insert(resultsToInsert)
      .select(`
        id,
        place,
        horse_number,
        prize_amount,
        collected,
        collected_at,
        created_at
      `)

    if (insertError) {
      console.error('Error inserting results:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save results' },
        { status: 500 }
      )
    }

    // Update event status based on finalization
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (finalize) {
      updateData.results_status = 'final'
      updateData.status = 'completed'
    } else {
      updateData.results_status = 'draft'
    }

    const { error: eventUpdateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)

    if (eventUpdateError) {
      console.error('Error updating event status:', eventUpdateError)
    }

    // Get winners with participant names
    const { data: winners, error: winnersError } = await supabase
      .from('assignments')
      .select(`
        horse_number,
        patron_entries!inner(
          id,
          participant_name,
          email,
          phone,
          join_code
        )
      `)
      .eq('event_id', eventId)
      .in('horse_number', results.map(r => r.horseNumber))

    const winnersData = winners?.map(assignment => {
      const result = results.find(r => r.horseNumber === assignment.horse_number)
      return {
        place: result?.place,
        horse_number: assignment.horse_number,
        participant_name: assignment.patron_entries[0].participant_name,
        email: assignment.patron_entries[0].email,
        phone: assignment.patron_entries[0].phone,
        join_code: assignment.patron_entries[0].join_code,
        prize_amount: result?.prizeAmount || 0,
        win_status: 'winner',
        notified_at: null,
        prize_claimed: false
      }
    }) || []

    console.log(`✅ Results saved successfully for event ${eventId}`, {
      resultsCount: insertedResults?.length || 0,
      finalized: finalize
    })

    return NextResponse.json({
      success: true,
      data: {
        results: insertedResults,
        winners: winnersData,
        summary: {
          total_participants: winners?.length || 0,
          winners_count: winnersData.length,
          prizes_unclaimed: winnersData.length,
          prizes_claimed: 0
        },
        event: {
          id: event.id,
          name: event.name,
          status: finalize ? 'completed' : event.status,
          results_status: finalize ? 'final' : 'draft'
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

    // Get current results with participant names via assignments
    const { data: results, error: resultsError } = await supabase
      .from('event_results')
      .select(`
        id,
        place,
        horse_number,
        prize_amount,
        collected,
        collected_at,
        created_at
      `)
      .eq('event_id', eventId)
      .order('place', { ascending: true })

    if (resultsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch results' },
        { status: 500 }
      )
    }

    // Get all participants with assignments for full leaderboard
    const { data: allAssignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        horse_number,
        patron_entries!inner(
          id,
          participant_name,
          email,
          phone,
          join_code
        ),
        event_horses!inner(
          number,
          name
        )
      `)
      .eq('event_id', eventId)

    // Build all participants array with results merged in
    let allParticipants = []
    let winners = []

    if (allAssignments && !assignmentsError) {
      allParticipants = allAssignments.map(assignment => {
        const result = results?.find(r => r.horse_number === assignment.horse_number)
        const participant = {
          place: result?.place || null,
          horseNumber: assignment.horse_number,
          horseName: assignment.event_horses[0]?.name || null,
          participantName: assignment.patron_entries[0].participant_name,
          email: assignment.patron_entries[0].email,
          phone: assignment.patron_entries[0].phone,
          joinCode: assignment.patron_entries[0].join_code,
          status: result ? 'finished' : 'finished',
          prizeAmount: result?.prize_amount || 0,
          collected: result?.collected || false
        }

        // Add to winners if they have a result (placed)
        if (result) {
          winners.push({
            place: result.place,
            horse_number: assignment.horse_number,
            participant_name: assignment.patron_entries[0].participant_name,
            email: assignment.patron_entries[0].email,
            phone: assignment.patron_entries[0].phone,
            join_code: assignment.patron_entries[0].join_code,
            prize_amount: result.prize_amount || 0,
            win_status: 'winner',
            notified_at: null,
            prize_claimed: result.collected || false
          })
        }

        return participant
      })

      // Sort by place (nulls last)
      allParticipants.sort((a, b) => {
        if (a.place === null && b.place === null) return 0
        if (a.place === null) return 1
        if (b.place === null) return -1
        return a.place - b.place
      })
    }

    // Build formatted results for display
    const formattedResults = results?.map(result => {
      const assignment = allAssignments?.find(a => a.horse_number === result.horse_number)
      return {
        place: result.place,
        horseNumber: result.horse_number,
        winnerName: assignment?.patron_entries[0]?.participant_name || null,
        horseName: assignment?.event_horses[0]?.name || null,
        prizeAmount: result.prize_amount || 0,
        positionText: getPositionText(result.place),
        status: 'finished',
        collected: result.collected || false
      }
    }) || []

    // Calculate summary stats
    const totalPrizes = results?.reduce((sum, r) => sum + (r.prize_amount || 0), 0) || 0
    const prizesDistributed = results?.filter(r => r.collected).reduce((sum, r) => sum + (r.prize_amount || 0), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        hasResults: results && results.length > 0,
        event: {
          id: event.id,
          name: event.name,
          venue: event.venue || 'Melbourne Cup Venue',
          startsAt: event.starts_at
        },
        results: formattedResults,
        allParticipants: allParticipants,
        winners: winners,
        summary: {
          totalParticipants: allAssignments?.length || 0,
          winnersCount: winners.length,
          totalPrizes: totalPrizes,
          prizesDistributed: prizesDistributed
        }
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

function getPositionText(place: number): string {
  if (place === 1) return '1st'
  if (place === 2) return '2nd'
  if (place === 3) return '3rd'
  return `${place}th`
}

// PUT - Toggle finalization status
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const { finalize } = await request.json()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate event exists and user has access
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, results_status, tenant_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check user access
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

    // Update results status
    const updateData: any = {
      results_status: finalize ? 'final' : 'pending',
      updated_at: new Date().toISOString()
    }

    if (finalize) {
      updateData.status = 'completed'
    }

    const { error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update results status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: finalize
          ? 'Results have been finalized and locked'
          : 'Results have been unlocked for editing',
        event: {
          id: event.id,
          name: event.name,
          status: finalize ? 'completed' : event.status,
          results_status: finalize ? 'final' : 'pending'
        }
      }
    })

  } catch (error) {
    console.error('Toggle finalization API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

