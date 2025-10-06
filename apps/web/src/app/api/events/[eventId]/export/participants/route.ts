import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

interface ParticipantExportData {
  id: string
  participant_name: string
  email?: string
  phone?: string
  marketing_consent: boolean
  join_code: string
  created_at: string
  updated_at: string
  horse_number?: number
  horse_name?: string
  jockey?: string
  assignment_order?: number
  user_agent?: string
  ip_address?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const includeAssignments = searchParams.get('include_assignments') === 'true'

    // Validate event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, created_at')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Build query for participants
    let query = supabase
      .from('patron_entries')
      .select(`
        id,
        participant_name,
        email,
        phone,
        marketing_consent,
        join_code,
        created_at,
        updated_at,
        user_agent,
        ip_address
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    // If including assignments, join with assignment data
    if (includeAssignments) {
      query = supabase
        .from('patron_entries')
        .select(`
          id,
          participant_name,
          email,
          phone,
          marketing_consent,
          join_code,
          created_at,
          updated_at,
          user_agent,
          ip_address,
          assignments:assignments!inner (
            draw_order,
            event_horse:event_horses (
              number,
              name,
              jockey
            )
          )
        `)
        .eq('event_id', eventId)
        .is('assignments.deleted_at', null)
        .order('created_at', { ascending: true })
    }

    const { data: participants, error: participantsError } = await query

    if (participantsError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch participants: ${participantsError.message}` },
        { status: 500 }
      )
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No participants found for this event' },
        { status: 404 }
      )
    }

    // Transform data for export
    const exportData: ParticipantExportData[] = participants.map(participant => {
      const baseData: ParticipantExportData = {
        id: participant.id,
        participant_name: participant.participant_name,
        email: participant.email || '',
        phone: participant.phone || '',
        marketing_consent: participant.marketing_consent,
        join_code: participant.join_code,
        created_at: new Date(participant.created_at).toLocaleString(),
        updated_at: new Date(participant.updated_at).toLocaleString(),
        user_agent: participant.user_agent || '',
        ip_address: participant.ip_address || ''
      }

      // Add assignment data if available
      if (includeAssignments && participant.assignments && participant.assignments.length > 0) {
        const assignment = participant.assignments[0] // Should only be one active assignment
        baseData.horse_number = assignment.event_horse?.number
        baseData.horse_name = assignment.event_horse?.name
        baseData.jockey = assignment.event_horse?.jockey
        baseData.assignment_order = assignment.draw_order
      }

      return baseData
    })

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const eventName = event.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const filename = `${eventName}_participants_${timestamp}`

    if (format === 'json') {
      return NextResponse.json(
        {
          success: true,
          data: exportData,
          meta: {
            event_name: event.name,
            event_created: event.created_at,
            export_date: new Date().toISOString(),
            total_participants: exportData.length,
            includes_assignments: includeAssignments
          }
        },
        {
          headers: {
            'Content-Disposition': `attachment; filename="${filename}.json"`,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Generate CSV
    const csvData = Papa.unparse(exportData, {
      header: true,
      columns: [
        'id',
        'participant_name',
        'email',
        'phone',
        'marketing_consent',
        'join_code',
        'created_at',
        'updated_at',
        ...(includeAssignments ? ['horse_number', 'horse_name', 'jockey', 'assignment_order'] : []),
        'user_agent',
        'ip_address'
      ]
    })

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Export participants error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}