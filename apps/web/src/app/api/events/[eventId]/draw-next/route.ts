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

    // Get participants who haven't been assigned horses yet
    const { data: participantsData, error: participantsError } = await supabaseAdmin
      .from('patron_entries')
      .select(`
        id,
        participant_name,
        created_at
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

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
      return NextResponse.json(
        { error: 'No participants waiting for assignment' },
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
    const { error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .insert({
        patron_entry_id: nextParticipant.id,
        event_horse_id: randomHorse.id
      })

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