import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CalcuttaDisplayData {
  event: {
    id: string
    name: string
    starts_at: string
    status: 'active' | 'drawing' | 'racing' | 'completed' | 'cancelled'
    mode: 'calcutta' | 'sweep'
    tenants?: {
      id: string
      name: string
      brand_color_primary?: string
      brand_color_secondary?: string
      logo_url?: string
    }
  }
  assignments: Array<{
    horse_number: number
    patron_entries: {
      participant_name: string
      join_code: string
    }
    auction_price?: number
  }>
  results: Array<{
    place: number
    horse_number: number
    prize_amount: number
  }>
  prizePool: {
    total: number
    firstPlace: number
    secondPlace: number
    thirdPlace: number
  }
  raceStatus: 'pre-draw' | 'drawing-complete' | 'pre-race' | 'racing' | 'completed'
}

// GET /api/events/[eventId]/calcutta-display - Public calcutta display data
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params

    console.log(`📺 Loading calcutta display data for event ${eventId}`)

    // Get event details (public access for display)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        starts_at,
        status,
        mode,
        tenants (
          id,
          name,
          brand_color_primary,
          brand_color_secondary,
          logo_url
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

    // Validate this is a calcutta event
    if (event.mode !== 'calcutta') {
      return NextResponse.json(
        { success: false, error: 'This view is for Calcutta events only' },
        { status: 400 }
      )
    }

    // Get horse assignments with owner details
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        horse_number,
        auction_price,
        patron_entries (
          participant_name,
          join_code
        )
      `)
      .eq('event_id', eventId)
      .order('horse_number', { ascending: true })

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
    }

    // Get current race results
    const { data: results, error: resultsError } = await supabase
      .from('event_results')
      .select('place, horse_number, prize_amount')
      .eq('event_id', eventId)
      .order('place', { ascending: true })

    if (resultsError) {
      console.error('Error fetching results:', resultsError)
    }

    // Calculate race status based on data
    let raceStatus: CalcuttaDisplayData['raceStatus'] = 'pre-draw'

    if (assignments && assignments.length > 0) {
      raceStatus = 'drawing-complete'

      if (event.status === 'racing') {
        raceStatus = 'racing'
      } else if (event.status === 'completed' && results && results.length > 0) {
        raceStatus = 'completed'
      } else if (event.status === 'active') {
        // Check if race is about to start (within 2 hours)
        const raceTime = new Date(event.starts_at)
        const now = new Date()
        const timeDiff = raceTime.getTime() - now.getTime()
        const hoursUntilRace = timeDiff / (1000 * 60 * 60)

        if (hoursUntilRace <= 2) {
          raceStatus = 'pre-race'
        }
      }
    }

    // Calculate prize pool
    const totalAuctionRevenue = (assignments || []).reduce((sum, assignment) => {
      return sum + (assignment.auction_price || 0)
    }, 0)

    const prizePool = {
      total: totalAuctionRevenue,
      firstPlace: Math.round(totalAuctionRevenue * 0.60), // 60% to winner
      secondPlace: Math.round(totalAuctionRevenue * 0.25), // 25% to second
      thirdPlace: Math.round(totalAuctionRevenue * 0.15)   // 15% to third
    }

    const displayData: CalcuttaDisplayData = {
      event,
      assignments: assignments || [],
      results: results || [],
      prizePool,
      raceStatus
    }

    console.log(`✅ Calcutta display data loaded: ${assignments?.length || 0} assignments, status: ${raceStatus}`)

    return NextResponse.json({
      success: true,
      data: displayData
    })

  } catch (error) {
    console.error('Calcutta display API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load display data' },
      { status: 500 }
    )
  }
}