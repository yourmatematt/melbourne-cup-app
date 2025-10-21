import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

interface DrawRequest {
  drawType?: 'single' | 'all'
  skipScratched?: boolean // Default true
  dryRun?: boolean // Test the draw without committing
}

interface DrawResponse {
  success: boolean
  assignments?: Assignment[]
  skippedHorses?: number[]
  stats?: {
    totalParticipants: number
    totalHorses: number
    assignmentsCreated: number
    seed: string
  }
  error?: string
}

interface Assignment {
  id: string
  patron_entry_id: string
  event_horse_id: string
  created_at: string
  patron_entry: {
    participant_name: string
    email?: string
  }
  event_horse: {
    number: number
    name: string
    jockey: string
  }
}

// Cryptographically secure Fisher-Yates shuffle
function secureShuffleArray<T>(array: T[], seed?: string): { shuffled: T[], usedSeed: string } {
  const result = [...array]
  let usedSeed: string

  if (seed) {
    // Use provided seed for deterministic results (auditing)
    usedSeed = seed
    // Create a simple PRNG from seed for deterministic results
    let seedValue = 0
    for (let i = 0; i < seed.length; i++) {
      seedValue = ((seedValue << 5) - seedValue + seed.charCodeAt(i)) & 0xffffffff
    }

    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280
      return seedValue / 233280
    }

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]]
    }
  } else {
    // Use cryptographically secure randomness
    usedSeed = randomBytes(32).toString('hex')

    for (let i = result.length - 1; i > 0; i--) {
      // Generate cryptographically secure random bytes
      const randomBuffer = randomBytes(4)
      const randomValue = randomBuffer.readUInt32BE(0)
      const j = randomValue % (i + 1);
      [result[i], result[j]] = [result[j], result[i]]
    }
  }

  return { shuffled: result, usedSeed }
}

// Round-robin assignment to horses
function assignToHorses(
  shuffledParticipants: any[],
  availableHorses: any[]
): { participantId: string, horseId: string, horseNumber: number, drawOrder: number }[] {
  const assignments: { participantId: string, horseId: string, horseNumber: number, drawOrder: number }[] = []

  if (availableHorses.length === 0) {
    throw new Error('No available horses for assignment')
  }

  shuffledParticipants.forEach((participant, index) => {
    const horseIndex = index % availableHorses.length
    const horse = availableHorses[horseIndex]

    assignments.push({
      participantId: participant.id,
      horseId: horse.id,
      horseNumber: horse.number,
      drawOrder: index + 1
    })
  })

  return assignments
}

// Simple logging function (can be enhanced later)
async function logDrawExecution(
  eventId: string,
  seed: string,
  assignmentCount: number,
  skippedHorses: number[]
) {
  console.log('Draw executed:', {
    eventId,
    seed: seed.substring(0, 16) + '...',
    assignmentCount,
    skippedHorses,
    timestamp: new Date().toISOString(),
    algorithm: 'fisher_yates_crypto'
  })
}

// Broadcast draw results to realtime channel
async function broadcastDrawResults(
  supabase: any,
  eventId: string,
  assignments: Assignment[]
) {
  try {
    await supabase
      .channel(`event_${eventId}`)
      .send({
        type: 'broadcast',
        event: 'draw_completed',
        payload: {
          eventId,
          assignments: assignments.length,
          timestamp: new Date().toISOString()
        }
      })
  } catch (error) {
    console.error('Failed to broadcast draw results:', error)
    // Don't throw - this is not critical for the draw operation
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()
  const startTime = Date.now()

  try {
    const { eventId } = params
    const body: DrawRequest = await request.json()
    const { drawType = 'all', skipScratched = true, dryRun = false } = body

    console.log(`🎯 Draw API: ${drawType} draw requested for event ${eventId}`, {
      body,
      timestamp: new Date().toISOString(),
      requestId: `draw_${eventId}_${Date.now()}`
    })

    // Validate event exists and is in correct state
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Allow draws when event is active or already drawing (for single draws)
    const allowedStatuses = drawType === 'single' ? ['active', 'drawing'] : ['active']
    if (!allowedStatuses.includes(event.status)) {
      const statusMessage = drawType === 'single'
        ? 'Event must be active or drawing to perform single draw'
        : 'Event must be active to perform full draw'
      return NextResponse.json(
        { success: false, error: statusMessage },
        { status: 400 }
      )
    }

    // For single draw, we allow existing assignments
    if (drawType === 'all') {
      // Check if full draw already exists
      const { data: existingAssignments, error: existingError } = await supabase
        .from('assignments')
        .select('id')
        .eq('event_id', eventId)
        .limit(1)

      if (existingError) {
        console.error('❌ Draw API: Error checking existing assignments:', existingError)
        return NextResponse.json(
          { success: false, error: 'Database error while checking existing assignments' },
          { status: 500 }
        )
      }

      if (existingAssignments && existingAssignments.length > 0) {
        console.log('❌ Draw API: Full draw already exists, rejecting request')
        return NextResponse.json(
          { success: false, error: 'Draw has already been executed for this event. Use single draw or clear assignments first.' },
          { status: 400 }
        )
      }
    }

    // Get unassigned participants
    const { data: allParticipants, error: participantsError } = await supabase
      .from('patron_entries')
      .select('id, participant_name, email')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (participantsError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch participants: ${participantsError.message}` },
        { status: 500 }
      )
    }

    if (!allParticipants || allParticipants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No participants found for this event' },
        { status: 400 }
      )
    }

    // Get existing assignments to filter out already assigned participants
    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select('patron_entry_id')
      .eq('event_id', eventId)

    const assignedParticipantIds = existingAssignments?.map(a => a.patron_entry_id) || []
    const unassignedParticipants = allParticipants.filter(p => !assignedParticipantIds.includes(p.id))

    // For single draw, only process one participant
    const participants = drawType === 'single'
      ? unassignedParticipants.slice(0, 1)
      : unassignedParticipants

    if (participants.length === 0) {
      console.log(`❌ Draw API: No unassigned participants found for ${drawType} draw`, {
        allParticipants: allParticipants?.length || 0,
        assignedParticipantIds: assignedParticipantIds.length,
        unassignedParticipants: unassignedParticipants.length
      })
      return NextResponse.json(
        { success: false, error: 'No unassigned participants found' },
        { status: 400 }
      )
    }

    // Get available horses (not scratched and not assigned)
    const { data: allHorses, error: horsesError } = await supabase
      .from('event_horses')
      .select('id, number, name, jockey, is_scratched')
      .eq('event_id', eventId)
      .order('number', { ascending: true })

    if (horsesError) {
      console.error(`❌ Draw API: Failed to fetch horses for event ${eventId}:`, horsesError)
      return NextResponse.json(
        { success: false, error: `Failed to fetch horses: ${horsesError.message}` },
        { status: 500 }
      )
    }

    console.log(`🐎 Draw API: Found ${allHorses?.length || 0} horses for event ${eventId}`, {
      horses: allHorses?.map(h => ({ id: h.id, number: h.number, name: h.name, scratched: h.is_scratched }))
    })

    if (!allHorses || allHorses.length === 0) {
      console.error(`❌ Draw API: No horses found for event ${eventId}. Horses must be created before drawing.`)
      return NextResponse.json(
        { success: false, error: 'No horses found for this event. Please create horses before running the draw.' },
        { status: 400 }
      )
    }

    const { data: assignedHorses } = await supabase
      .from('assignments')
      .select('event_horse_id')
      .eq('event_id', eventId)

    const assignedHorseIds = assignedHorses?.map(a => a.event_horse_id) || []
    let availableHorses = allHorses?.filter(h => !assignedHorseIds.includes(h.id)) || []

    if (skipScratched) {
      availableHorses = availableHorses.filter(h => !h.is_scratched)
    }

    if (availableHorses.length === 0) {
      console.log(`❌ Draw API: No available horses found for ${drawType} draw`, {
        allHorses: allHorses?.length || 0,
        assignedHorseIds: assignedHorseIds.length,
        availableBeforeFilter: allHorses?.filter(h => !assignedHorseIds.includes(h.id)).length || 0,
        scratched: allHorses?.filter(h => h.is_scratched).length || 0
      })

      const errorMessage = allHorses?.length === 0
        ? 'No horses found for this event. Please create horses before running the draw.'
        : assignedHorseIds.length === allHorses?.length
        ? 'All horses have already been assigned. No more draws can be performed.'
        : 'No available horses found for assignment. All remaining horses may be scratched.'

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    // Get scratched horse numbers for reporting
    const skippedHorses = allHorses
      ?.filter(h => h.is_scratched)
      .map(h => h.number) || []

    // Execute the draw algorithm - shuffle both participants AND horses for maximum randomness
    const { shuffled: shuffledParticipants, usedSeed } = secureShuffleArray(participants)
    const { shuffled: shuffledHorses } = secureShuffleArray(availableHorses, usedSeed + '_horses')
    const assignmentPlan = assignToHorses(shuffledParticipants, shuffledHorses)

    // If dry run, return the plan without committing
    if (dryRun) {
      return NextResponse.json({
        success: true,
        stats: {
          totalParticipants: participants.length,
          totalHorses: availableHorses.length,
          assignmentsCreated: assignmentPlan.length,
          seed: usedSeed
        },
        skippedHorses,
        assignments: assignmentPlan.map((a, index) => ({
          patron_entry_id: a.participantId,
          event_horse_id: a.horseId,
          patron_entry: shuffledParticipants.find(p => p.id === a.participantId),
          event_horse: shuffledHorses.find(h => h.id === a.horseId)
        }))
      })
    }

    // Execute assignments using batch insert for reliability
    console.log(`📝 Draw API: Preparing ${assignmentPlan.length} assignments for batch insert`)

    const assignmentsToInsert = assignmentPlan.map(assignment => ({
      event_id: eventId,
      patron_entry_id: assignment.participantId,
      event_horse_id: assignment.horseId,
      horse_number: assignment.horseNumber
    }))

    console.log(`💾 Draw API: Executing batch insert for ${assignmentsToInsert.length} assignments`)

    // Use batch insert for all assignments at once (atomic operation)
    const { data: insertedAssignments, error: batchInsertError } = await supabase
      .from('assignments')
      .insert(assignmentsToInsert)
      .select(`
        id,
        patron_entry_id,
        event_horse_id,
        created_at,
        patron_entries!patron_entry_id (
          participant_name,
          email
        ),
        event_horses!event_horse_id (
          number,
          name,
          jockey
        )
      `)

    if (batchInsertError) {
      console.error('❌ Draw API: Batch assignment insert failed:', {
        error: batchInsertError,
        eventId,
        assignmentCount: assignmentsToInsert.length,
        errorCode: batchInsertError.code,
        errorDetails: batchInsertError.details,
        errorMessage: batchInsertError.message
      })

      // Provide more specific error messages based on error type
      let errorMessage = `Failed to create assignments: ${batchInsertError.message}`

      if (batchInsertError.code === '23505') { // Unique constraint violation
        errorMessage = 'Assignment conflict detected. Some participants or horses may already be assigned.'
      } else if (batchInsertError.code === '23503') { // Foreign key violation
        errorMessage = 'Invalid participant or horse reference. Please refresh and try again.'
      } else if (batchInsertError.code === '42P01') { // Table doesn't exist
        errorMessage = 'Database configuration error. Please contact support.'
      }

      return NextResponse.json(
        { success: false, error: errorMessage, details: batchInsertError },
        { status: 500 }
      )
    }

    const createdAssignments = insertedAssignments || []
    console.log(`✅ Draw API: Batch insert successful - created ${createdAssignments.length} assignments`)

    // Update event status to 'drawing' if this was a full draw
    if (drawType === 'all') {
      console.log(`📊 Draw API: Updating event status to 'drawing' for full draw`)
      const { error: statusUpdateError } = await supabase
        .from('events')
        .update({ status: 'drawing' })
        .eq('id', eventId)

      if (statusUpdateError) {
        console.error('❌ Draw API: Failed to update event status:', statusUpdateError)
        // Don't fail the entire operation for this, but log it
        console.warn('⚠️ Draw API: Draw completed successfully but event status update failed')
      } else {
        console.log(`✅ Draw API: Event status updated to 'drawing'`)
      }
    }

    // Broadcast results
    await broadcastDrawResults(supabase, eventId, createdAssignments)

    const executionTime = Date.now() - startTime
    console.log(`✅ Draw API: ${drawType} draw completed successfully`, {
      assignmentsCreated: createdAssignments.length,
      participants: participants.length,
      availableHorses: availableHorses.length,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      assignments: createdAssignments,
      skippedHorses,
      stats: {
        totalParticipants: participants.length,
        totalHorses: availableHorses.length,
        assignmentsCreated: assignmentPlan.length,
        seed: usedSeed,
        executionTimeMs: executionTime
      }
    })

  } catch (error) {
    console.error('Draw execution error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve current draw status
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params

    // Get current assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        id,
        patron_entry_id,
        event_horse_id,
        created_at,
        patron_entries!patron_entry_id (
          participant_name,
          email
        ),
        event_horses!event_horse_id (
          number,
          name,
          jockey
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (assignmentsError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch assignments: ${assignmentsError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assignments: assignments || [],
      hasDrawn: (assignments?.length || 0) > 0
    })

  } catch (error) {
    console.error('Get draw status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}