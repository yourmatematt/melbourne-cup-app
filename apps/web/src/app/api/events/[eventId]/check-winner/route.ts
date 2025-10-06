import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CheckWinnerRequest {
  joinCode: string
}

// POST - Check if participant won by join code
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const body: CheckWinnerRequest = await request.json()
    const { joinCode } = body

    if (!joinCode || !joinCode.trim()) {
      return NextResponse.json(
        { success: false, error: 'Join code is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Winner check for event ${eventId}, join code: ${joinCode}`)

    // Validate event exists and is publicly accessible
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, results_status, status, starts_at, tenants(name)')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if event has results
    if (event.results_status === 'pending') {
      return NextResponse.json({
        success: true,
        data: {
          hasResults: false,
          event: {
            id: event.id,
            name: event.name,
            venue: event.tenants?.name || 'Unknown Venue'
          },
          message: 'Results are not yet available. Please check back later.'
        }
      })
    }

    // Use the database function to check winner status
    const { data: winnerData, error: winnerError } = await supabase
      .rpc('check_winner_by_join_code', {
        event_uuid: eventId,
        participant_join_code: joinCode.trim()
      })

    if (winnerError) {
      console.error('Error checking winner:', winnerError)
      return NextResponse.json(
        { success: false, error: 'Failed to check winner status' },
        { status: 500 }
      )
    }

    if (!winnerData || winnerData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasResults: true,
          found: false,
          event: {
            id: event.id,
            name: event.name,
            venue: event.tenants?.name || 'Unknown Venue'
          },
          message: 'Join code not found. Please check your code and try again.'
        }
      })
    }

    const result = winnerData[0]

    // Get additional prize and notification details
    const { data: participantDetails, error: detailsError } = await supabase
      .from('patron_entries')
      .select('notified_at, prize_claimed, prize_claimed_at')
      .eq('event_id', eventId)
      .eq('join_code', joinCode.toUpperCase())
      .single()

    if (detailsError) {
      console.error('Error getting participant details:', detailsError)
    }

    // Determine position description
    let positionText = 'unplaced'
    if (result.place === 1) positionText = '1st place'
    else if (result.place === 2) positionText = '2nd place'
    else if (result.place === 3) positionText = '3rd place'
    else if (result.place <= 8) positionText = `${result.place}th place`

    const response = {
      success: true,
      data: {
        hasResults: true,
        found: true,
        won: result.won,
        participant: {
          name: result.participant_name,
          joinCode: joinCode.toUpperCase(),
          horseNumber: result.horse_number,
          place: result.place,
          positionText,
          winStatus: result.win_status,
          prizeAmount: result.prize_amount || 0,
          notified: !!participantDetails?.notified_at,
          prizeClaimed: !!participantDetails?.prize_claimed
        },
        event: {
          id: event.id,
          name: result.event_name,
          venue: result.venue_name
        },
        message: result.won
          ? `Congratulations! You won ${positionText}!`
          : `Thank you for participating. Your horse finished ${positionText}.`
      }
    }

    console.log(`✅ Winner check completed for ${joinCode}: ${result.won ? 'WINNER' : 'No win'}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Check winner API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get public results leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, results_status, starts_at, tenants(name)')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if results are available
    if (event.results_status === 'pending') {
      return NextResponse.json({
        success: true,
        data: {
          hasResults: false,
          event: {
            id: event.id,
            name: event.name,
            venue: event.tenants?.name || 'Unknown Venue',
            startsAt: event.starts_at
          },
          message: 'Results will be published after the race.'
        }
      })
    }

    // Get results with winner details
    const { data: results, error: resultsError } = await supabase
      .from('event_results')
      .select(`
        place,
        horse_number,
        prize_amount,
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

    // Get winner names (optionally hide for privacy)
    const { data: winners, error: winnersError } = await supabase
      .rpc('get_event_winners', { event_uuid: eventId })

    if (winnersError) {
      console.error('Error getting winners:', winnersError)
    }

    // Format results for public display
    const publicResults = (results || []).map(result => {
      const winner = winners?.find(w => w.place === result.place)
      return {
        place: result.place,
        horseNumber: result.horse_number,
        winnerName: winner?.participant_name || null,
        prizeAmount: result.prize_amount || 0,
        positionText: result.place === 1 ? '1st' : result.place === 2 ? '2nd' : result.place === 3 ? '3rd' : `${result.place}th`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        hasResults: true,
        event: {
          id: event.id,
          name: event.name,
          venue: event.tenants?.name || 'Unknown Venue',
          startsAt: event.starts_at,
          resultsStatus: event.results_status
        },
        results: publicResults,
        winnersCount: winners?.length || 0,
        totalPrizes: publicResults.reduce((sum, r) => sum + (r.prizeAmount || 0), 0)
      }
    })

  } catch (error) {
    console.error('Get public results API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}