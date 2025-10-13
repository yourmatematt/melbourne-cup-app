import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const eventId = params.eventId
    console.log('🎲 Draw Next API called for event:', eventId)

    // Validate eventId
    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      console.error('❌ Invalid or missing eventId:', eventId)
      return NextResponse.json(
        { error: 'Valid Event ID is required' },
        { status: 400 }
      )
    }

    console.log('✅ EventId validated:', eventId)

    // Fetch event to check if payment is required
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('requires_payment')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('❌ Error fetching event:', eventError)
      throw eventError
    }

    console.log('✅ Event payment requirement:', event?.requires_payment ? 'Required' : 'Not required')

    // Get participants who haven't been assigned horses yet
    const participantsQuery = supabaseAdmin
      .from('patron_entries')
      .select(`
        id,
        participant_name,
        created_at,
        payment_status
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    // If event requires payment, only include paid participants
    if (event?.requires_payment) {
      participantsQuery.eq('payment_status', 'paid')
    }

    const { data: participantsData, error: participantsError } = await participantsQuery

    if (participantsError) {
      console.error('❌ Error fetching participants:', participantsError)
      throw participantsError
    }

    // Get existing assignments to filter out assigned participants
    const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
      .from('assignments')
      .select('patron_entry_id, event_horse_id')
      .in('patron_entry_id', (participantsData || []).map(p => p.id))

    if (assignmentsError) {
      console.error('❌ Error fetching assignments:', assignmentsError)
      throw assignmentsError
    }

    // Filter out participants who already have assignments
    const assignedParticipantIds = new Set(assignmentsData?.map(a => a.patron_entry_id) || [])
    const waitingParticipants = (participantsData || []).filter(p => !assignedParticipantIds.has(p.id))

    if (waitingParticipants.length === 0) {
      const message = event?.requires_payment
        ? 'No paid participants waiting for assignment'
        : 'No participants waiting for assignment'
      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    // Get the next participant (oldest first)
    const nextParticipant = waitingParticipants[0]
    console.log('👤 Next participant:', nextParticipant.participant_name)

    // Get all horses for this event
    const { data: allHorsesData, error: allHorsesError } = await supabaseAdmin
      .from('event_horses')
      .select('id, number, name')
      .eq('event_id', eventId)
      .order('number', { ascending: true })

    if (allHorsesError) {
      console.error('❌ Error fetching horses:', allHorsesError)
      throw allHorsesError
    }

    // Get already assigned horse IDs
    const { data: assignedHorsesData, error: assignedHorsesError } = await supabaseAdmin
      .from('assignments')
      .select('event_horse_id')
      .eq('event_id', eventId)
      .not('event_horse_id', 'is', null)

    if (assignedHorsesError) {
      console.error('❌ Error fetching assigned horses:', assignedHorsesError)
      throw assignedHorsesError
    }

    const assignedHorseIds = new Set(assignedHorsesData?.map(a => a.event_horse_id) || [])
    const availableHorses = (allHorsesData || []).filter(h => !assignedHorseIds.has(h.id))

    if (availableHorses.length === 0) {
      return NextResponse.json(
        { error: 'No horses available for assignment' },
        { status: 400 }
      )
    }

    // Randomly select an available horse
    const randomHorse = availableHorses[Math.floor(Math.random() * availableHorses.length)]
    console.log('🐎 Selected horse:', randomHorse.number, randomHorse.name)

    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .insert({
        event_id: eventId,
        event_horse_id: randomHorse.id,
        patron_entry_id: nextParticipant.id,
        horse_number: randomHorse.number,
        assigned_by: null
      })
      .select()
      .single()

    if (assignmentError) {
      console.error('❌ Error creating assignment:', assignmentError)
      throw assignmentError
    }

    console.log('✅ Assignment created successfully')

    // Return success with assignment details
    return NextResponse.json({
      success: true,
      assignment: {
        participant: {
          id: nextParticipant.id,
          name: nextParticipant.participant_name
        },
        horse: {
          id: randomHorse.id,
          number: randomHorse.number,
          name: randomHorse.name
        }
      }
    })

  } catch (error: any) {
    console.error('❌ Unexpected error in draw-next API:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}