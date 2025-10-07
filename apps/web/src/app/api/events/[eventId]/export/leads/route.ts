import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

interface LeadExportData {
  id: string
  participant_name: string
  email?: string
  phone?: string
  contact_preference: 'email' | 'phone' | 'both'
  created_at: string
  horse_assignment?: string
  source: string
  marketing_tags?: string
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

    // Get current user and validate access
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate event exists and user has access (RLS will enforce tenant filtering)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, created_at, tenant_id, tenants!tenant_id(name)')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found or access denied' },
        { status: 404 }
      )
    }

    // Build query for participants with consent and contact info
    let query = supabase
      .from('patron_entries')
      .select(`
        id,
        participant_name,
        email,
        phone,
        marketing_consent,
        created_at
      `)
      .eq('event_id', eventId)
      .eq('marketing_consent', true)
      .or('email.not.is.null,phone.not.is.null')
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
          created_at,
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
        .eq('marketing_consent', true)
        .or('email.not.is.null,phone.not.is.null')
        .is('assignments.deleted_at', null)
        .order('created_at', { ascending: true })
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch leads: ${leadsError.message}` },
        { status: 500 }
      )
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No marketable leads found for this event' },
        { status: 404 }
      )
    }

    // Transform data for export
    const exportData: LeadExportData[] = leads.map(lead => {
      // Determine contact preference
      let contactPreference: 'email' | 'phone' | 'both' = 'email'
      if (lead.email && lead.phone) {
        contactPreference = 'both'
      } else if (lead.phone && !lead.email) {
        contactPreference = 'phone'
      }

      const baseData: LeadExportData = {
        id: lead.id,
        participant_name: lead.participant_name,
        email: lead.email || '',
        phone: lead.phone || '',
        contact_preference: contactPreference,
        created_at: new Date(lead.created_at).toLocaleString(),
        source: 'Melbourne Cup Event',
        marketing_tags: `melbourne-cup-2024,${event.tenants?.name?.toLowerCase().replace(/\s+/g, '-') || 'venue'}`
      }

      // Add assignment data if available
      if (includeAssignments && lead.assignments && lead.assignments.length > 0) {
        const assignment = lead.assignments[0]
        baseData.horse_assignment = `Horse #${assignment.event_horse?.number} - ${assignment.event_horse?.name}`
      }

      return baseData
    })

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const eventName = event.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const filename = `${eventName}_leads_${timestamp}`

    if (format === 'json') {
      return NextResponse.json(
        {
          success: true,
          data: exportData,
          meta: {
            event_name: event.name,
            venue_name: event.tenants?.name || 'Unknown',
            event_created: event.created_at,
            export_date: new Date().toISOString(),
            total_leads: exportData.length,
            includes_assignments: includeAssignments,
            contact_breakdown: {
              email_only: exportData.filter(l => l.contact_preference === 'email').length,
              phone_only: exportData.filter(l => l.contact_preference === 'phone').length,
              both: exportData.filter(l => l.contact_preference === 'both').length
            }
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

    // Generate CSV with marketing-focused headers
    const csvData = Papa.unparse(exportData, {
      header: true,
      columns: [
        'id',
        'participant_name',
        'email',
        'phone',
        'contact_preference',
        'created_at',
        ...(includeAssignments ? ['horse_assignment'] : []),
        'source',
        'marketing_tags'
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
    console.error('Export leads error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}