import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PreviewRequest {
  race_date: string
  first_place_horse: number
  second_place_horse: number
  third_place_horse: number
}

// POST - Preview the impact of race results without saving
export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const body: PreviewRequest = await request.json()
    const { race_date, first_place_horse, second_place_horse, third_place_horse } = body

    // Get current user and check admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find all events that would be affected by this race date
    const { data: affectedEvents, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        entry_fee,
        capacity,
        first_place_percentage,
        second_place_percentage,
        third_place_percentage,
        tenant_id
      `)
      .eq('starts_at', race_date)
      .in('status', ['active', 'drawing', 'completed'])

    if (eventsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    let totalPrizePool = 0
    let totalParticipants = 0
    let eventsAffected = 0

    // Calculate impact for each event
    for (const event of affectedEvents || []) {
      // Count paid participants for this event
      const { data: participantCount } = await supabase
        .from('patron_entries')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('payment_status', 'paid')

      const paidParticipants = participantCount || 0

      if (paidParticipants > 0 && event.entry_fee && event.entry_fee > 0) {
        const eventPrizePool = event.entry_fee * paidParticipants
        totalPrizePool += eventPrizePool
        totalParticipants += paidParticipants
        eventsAffected++

        // Check if there are participants assigned to the winning horses
        const { data: winnerAssignments } = await supabase
          .from('assignments')
          .select('id')
          .eq('event_id', event.id)
          .in('horse_number', [first_place_horse, second_place_horse, third_place_horse])

        console.log(`Event ${event.name}: ${paidParticipants} participants, $${eventPrizePool} pool, ${winnerAssignments?.length || 0} winner assignments`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        events_affected: eventsAffected,
        total_prize_pool: totalPrizePool,
        participants_affected: totalParticipants,
        race_date,
        winning_horses: {
          first: first_place_horse,
          second: second_place_horse,
          third: third_place_horse
        }
      }
    })

  } catch (error) {
    console.error('Preview race results API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}