import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/events/[eventId]/print-data - Get structured data for print views
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'participants'

    console.log(`📄 Loading print data for event ${eventId}, type: ${type}`)

    // Get current user and validate access
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get event and validate access
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        starts_at,
        capacity,
        status,
        tenant_id,
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

    if (type === 'participants') {
      // Get participants with assignments
      const { data: participants, error: participantsError } = await supabase
        .from('patron_entries')
        .select(`
          id,
          participant_name,
          email,
          phone,
          join_code,
          created_at,
          assignments (
            id
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (participantsError) {
        throw new Error('Failed to fetch participants')
      }

      // Get stats
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .eq('event_id', eventId)

      if (assignmentsError) {
        console.error('Error fetching assignments count:', assignmentsError)
      }

      const stats = {
        participantCount: participants?.length || 0,
        assignmentCount: assignments?.length || 0
      }

      return NextResponse.json({
        success: true,
        data: {
          event,
          stats,
          participants: participants || []
        }
      })
    }

    if (type === 'draw-results') {
      // Get assignments with participant details
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id,
          created_at,
          event_horses (
            number,
            name
          ),
          patron_entries (
            participant_name,
            join_code
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (assignmentsError) {
        throw new Error('Failed to fetch draw results')
      }

      return NextResponse.json({
        success: true,
        data: {
          event,
          assignments: assignments || []
        }
      })
    }

    if (type === 'winners') {
      // Get results with participant details
      const { data: results, error: resultsError } = await supabase
        .from('event_results')
        .select('place, horse_number, prize_amount')
        .eq('event_id', eventId)
        .order('place', { ascending: true })

      if (resultsError) {
        throw new Error('Failed to fetch results')
      }

      // Get participant details for winners
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id,
          event_horses (
            number,
            name
          ),
          patron_entries (
            participant_name,
            email,
            phone,
            join_code
          )
        `)
        .eq('event_id', eventId)

      if (assignmentsError) {
        console.error('Error fetching winner details:', assignmentsError)
      }

      return NextResponse.json({
        success: true,
        data: {
          event,
          results: results || [],
          assignments: assignments || []
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid print data type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Print data API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load print data' },
      { status: 500 }
    )
  }
}