import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SaveRaceResultsRequest {
  race_name: string
  race_date: string
  first_place_horse: number
  second_place_horse: number
  third_place_horse: number
}

// GET - Fetch existing race results
export async function GET(request: NextRequest) {
  const supabase = createClient()

  try {
    // Get current user and check admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch all race results with summaries
    const { data: raceResults, error: resultsError } = await supabase
      .from('race_results')
      .select('*')
      .order('created_at', { ascending: false })

    if (resultsError) {
      console.error('Error fetching race results:', resultsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch race results' },
        { status: 500 }
      )
    }

    // Get summary for each race result
    const resultsWithSummary = []
    for (const result of raceResults || []) {
      try {
        const { data: summary } = await supabase
          .rpc('get_race_results_summary', { race_result_id: result.id })
          .single()

        resultsWithSummary.push({
          ...result,
          summary
        })
      } catch (error) {
        console.error(`Error getting summary for race result ${result.id}:`, error)
        resultsWithSummary.push(result)
      }
    }

    return NextResponse.json({
      success: true,
      data: resultsWithSummary
    })

  } catch (error) {
    console.error('Get race results API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save new race results and trigger auto-calculation
export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const body: SaveRaceResultsRequest = await request.json()
    const { race_name, race_date, first_place_horse, second_place_horse, third_place_horse } = body

    console.log('🏁 Race Results API: Saving results', { race_name, race_date, first_place_horse, second_place_horse, third_place_horse })

    // Validate request
    if (!race_name || !race_date || !first_place_horse || !second_place_horse || !third_place_horse) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate horse numbers
    const horses = [first_place_horse, second_place_horse, third_place_horse]
    if (horses.some(h => h < 1 || h > 24)) {
      return NextResponse.json(
        { success: false, error: 'Horse numbers must be between 1 and 24' },
        { status: 400 }
      )
    }

    // Check for duplicates
    if (new Set(horses).size !== 3) {
      return NextResponse.json(
        { success: false, error: 'Each position must have a different horse number' },
        { status: 400 }
      )
    }

    // Get current user and check admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if results already exist for this race/date
    const { data: existingResult } = await supabase
      .from('race_results')
      .select('id')
      .eq('race_name', race_name)
      .eq('race_date', race_date)
      .single()

    if (existingResult) {
      return NextResponse.json(
        { success: false, error: `Results already exist for ${race_name} on ${race_date}` },
        { status: 409 }
      )
    }

    // Insert race results - this will trigger the auto-calculation function
    const { data: insertedResult, error: insertError } = await supabase
      .from('race_results')
      .insert({
        race_name,
        race_date,
        first_place_horse,
        second_place_horse,
        third_place_horse,
        created_by: user.id
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Error inserting race results:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save race results' },
        { status: 500 }
      )
    }

    // Get the summary of what was affected
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_race_results_summary', { race_result_id: insertedResult.id })
      .single()

    if (summaryError) {
      console.error('Error getting race results summary:', summaryError)
    }

    console.log('✅ Race results saved successfully', {
      id: insertedResult.id,
      summary
    })

    return NextResponse.json({
      success: true,
      data: {
        race_result: insertedResult,
        summary: summary || {
          total_events_affected: 0,
          total_prize_pool_distributed: 0,
          total_participants_affected: 0
        }
      }
    })

  } catch (error) {
    console.error('Save race results API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}