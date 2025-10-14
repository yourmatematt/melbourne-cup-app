import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

interface RegisterRequest {
  fullName: string
  email?: string
  phone?: string
  marketingConsent?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  // Use service role for public registration - updated to use correct schema
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { eventId } = params
    const body: RegisterRequest = await request.json()

    // Validate required fields
    if (!body.fullName || !body.fullName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, capacity, requires_payment')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if event is accepting entries
    if (event.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Event is not currently accepting entries' },
        { status: 400 }
      )
    }

    // Check if event is full
    const { count: participantCount, error: countError } = await supabase
      .from('patron_entries')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if (countError) {
      console.error('Error counting participants:', countError)
      return NextResponse.json(
        { success: false, error: 'Failed to check event capacity' },
        { status: 500 }
      )
    }

    if (participantCount && participantCount >= event.capacity) {
      return NextResponse.json(
        { success: false, error: 'Sorry, this event is full!' },
        { status: 400 }
      )
    }

    // Check for duplicate email if provided
    if (body.email) {
      const { data: existing } = await supabase
        .from('patron_entries')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', body.email.trim())
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { success: false, error: 'This email is already registered for this event' },
          { status: 400 }
        )
      }
    }

    // Generate unique join code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Insert new patron entry (using correct database schema)
    const { data: newEntry, error: insertError } = await supabase
      .from('patron_entries')
      .insert({
        event_id: eventId,
        participant_name: body.fullName.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        marketing_consent: body.marketingConsent || false,
        join_code: joinCode,
        entry_method: 'self-registered',
        payment_status: event.requires_payment ? 'pending' : 'paid',
        created_at: new Date().toISOString()
      })
      .select('id, join_code, participant_name, email')
      .single()

    if (insertError) {
      console.error('Registration error details:', JSON.stringify(insertError, null, 2))
      return NextResponse.json(
        { success: false, error: 'Failed to register participant', details: insertError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        participant: {
          id: newEntry.id,
          name: newEntry.participant_name,
          joinCode: newEntry.join_code,
          email: newEntry.email
        },
        event: {
          id: event.id,
          name: event.name
        }
      }
    })

  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check event status - uses service role for public access
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  // Use service role for public event access
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { eventId } = params

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        starts_at,
        status,
        capacity,
        lead_capture,
        entry_fee,
        first_place_percentage,
        second_place_percentage,
        third_place_percentage,
        tenants!tenant_id (
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

    // Get participant count using simple query
    const { count: participantCount, error: countError } = await supabase
      .from('patron_entries')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if (countError) {
      console.error('Error getting participant count:', countError)
    }

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          starts_at: event.starts_at,
          status: event.status,
          capacity: event.capacity,
          lead_capture: event.lead_capture,
          entry_fee: event.entry_fee,
          first_place_percentage: event.first_place_percentage,
          second_place_percentage: event.second_place_percentage,
          third_place_percentage: event.third_place_percentage,
          tenant: event.tenants
        },
        participantCount: participantCount || 0
      }
    })

  } catch (error) {
    console.error('Event status API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}