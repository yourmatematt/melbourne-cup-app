import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ExportQuery {
  type: 'participants' | 'draw-results' | 'winners' | 'audit-log'
  format?: 'csv' | 'xlsx'
  filter?: {
    paymentStatus?: 'paid' | 'pending' | 'all'
    entryMethod?: 'manual' | 'self-registered' | 'all'
    dateFrom?: string
    dateTo?: string
  }
  columns?: string[]
  redacted?: boolean
}

// GET /api/events/[eventId]/export - Unified export endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type') as ExportQuery['type']
    const format = searchParams.get('format') as ExportQuery['format'] || 'csv'
    const redacted = searchParams.get('redacted') === 'true'

    if (!type || !['participants', 'draw-results', 'winners', 'audit-log'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid export type' },
        { status: 400 }
      )
    }

    console.log(`📤 Exporting ${type} for event ${eventId} (format: ${format})`)

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

    let csvData = ''
    let filename = ''

    switch (type) {
      case 'participants':
        const participantsResult = await exportParticipants(supabase, eventId, event, redacted)
        csvData = participantsResult.csv
        filename = participantsResult.filename
        break

      case 'draw-results':
        const drawResult = await exportDrawResults(supabase, eventId, event)
        csvData = drawResult.csv
        filename = drawResult.filename
        break

      case 'winners':
        const winnersResult = await exportWinners(supabase, eventId, event, redacted)
        csvData = winnersResult.csv
        filename = winnersResult.filename
        break

      case 'audit-log':
        const auditResult = await exportAuditLog(supabase, eventId, event)
        csvData = auditResult.csv
        filename = auditResult.filename
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported export type' },
          { status: 400 }
        )
    }

    // Set headers for CSV download
    const headers = new Headers({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    // Add UTF-8 BOM for Excel compatibility
    const csvWithBOM = '\uFEFF' + csvData

    console.log(`✅ Export completed: ${filename} (${csvWithBOM.length} bytes)`)

    return new NextResponse(csvWithBOM, { headers })

  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    )
  }
}

async function exportParticipants(supabase: any, eventId: string, event: any, redacted: boolean) {
  const { data: participants, error } = await supabase
    .from('patron_entries')
    .select(`
      id,
      participant_name,
      email,
      phone,
      entry_method,
      join_code,
      payment_status,
      created_at,
      assignments (
        horse_number
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error('Failed to fetch participants')
  }

  // CSV headers
  const headers = [
    'Entry Number',
    'Participant Name',
    redacted ? 'Email (Redacted)' : 'Email',
    redacted ? 'Phone (Redacted)' : 'Phone',
    'Entry Method',
    'Join Code',
    'Horse Number',
    'Payment Status',
    'Entry Date',
    'Entry Time'
  ]

  const rows = participants.map((p: any, index: number) => {
    const entryDate = new Date(p.created_at)
    return [
      index + 1,
      escapeCsvField(p.participant_name || ''),
      redacted ? '***@***.***' : escapeCsvField(p.email || ''),
      redacted ? '***-***-***' : escapeCsvField(p.phone || ''),
      p.entry_method || 'self-registered',
      p.join_code,
      p.assignments?.[0]?.horse_number || 'Not assigned',
      p.payment_status || 'free',
      entryDate.toLocaleDateString('en-AU'),
      entryDate.toLocaleTimeString('en-AU')
    ]
  })

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const datestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const eventName = sanitizeFilename(event.name)
  const filename = `${eventName}-participants-${datestamp}.csv`

  return { csv, filename }
}

async function exportDrawResults(supabase: any, eventId: string, event: any) {
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select(`
      horse_number,
      created_at,
      patron_entries!patron_entry_id (
        participant_name,
        join_code
      )
    `)
    .eq('event_id', eventId)
    .order('horse_number', { ascending: true })

  if (error) {
    throw new Error('Failed to fetch draw results')
  }

  // CSV headers
  const headers = [
    'Horse Number',
    'Participant Name',
    'Join Code',
    'Draw Date',
    'Draw Time'
  ]

  const rows = assignments.map((a: any) => {
    const drawDate = new Date(a.created_at)
    return [
      a.horse_number,
      escapeCsvField(a.patron_entries?.participant_name || ''),
      a.patron_entries?.join_code || '',
      drawDate.toLocaleDateString('en-AU'),
      drawDate.toLocaleTimeString('en-AU')
    ]
  })

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const datestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const eventName = sanitizeFilename(event.name)
  const filename = `${eventName}-draw-results-${datestamp}.csv`

  return { csv, filename }
}

async function exportWinners(supabase: any, eventId: string, event: any, redacted: boolean) {
  // Get winners from event results
  const { data: results, error: resultsError } = await supabase
    .from('event_results')
    .select('place, horse_number, prize_amount')
    .eq('event_id', eventId)
    .order('place', { ascending: true })

  if (resultsError) {
    throw new Error('Failed to fetch results')
  }

  if (!results || results.length === 0) {
    // Return empty CSV with headers if no results yet
    const headers = [
      'Place',
      'Horse Number',
      'Participant Name',
      redacted ? 'Email (Redacted)' : 'Email',
      redacted ? 'Phone (Redacted)' : 'Phone',
      'Join Code',
      'Prize Amount',
      'Claimed Status'
    ]

    const csv = headers.join(',') + '\n'
    const datestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const eventName = sanitizeFilename(event.name)
    const filename = `${eventName}-winners-${datestamp}.csv`

    return { csv, filename }
  }

  // Get participant details for winners
  const { data: assignments, error: assignmentsError } = await supabase
    .from('assignments')
    .select(`
      horse_number,
      patron_entries!patron_entry_id (
        participant_name,
        email,
        phone,
        join_code,
        prize_claimed
      )
    `)
    .eq('event_id', eventId)
    .in('horse_number', results.map((r: any) => r.horse_number))

  if (assignmentsError) {
    throw new Error('Failed to fetch winner details')
  }

  // CSV headers
  const headers = [
    'Place',
    'Horse Number',
    'Participant Name',
    redacted ? 'Email (Redacted)' : 'Email',
    redacted ? 'Phone (Redacted)' : 'Phone',
    'Join Code',
    'Prize Amount',
    'Claimed Status'
  ]

  const rows = results.map((result: any) => {
    const assignment = assignments.find((a: any) => a.horse_number === result.horse_number)
    const participant = assignment?.patron_entries

    const placeText = result.place === 1 ? '1st' : result.place === 2 ? '2nd' : result.place === 3 ? '3rd' : `${result.place}th`

    return [
      placeText,
      result.horse_number,
      escapeCsvField(participant?.participant_name || 'Unknown'),
      redacted ? '***@***.***' : escapeCsvField(participant?.email || ''),
      redacted ? '***-***-***' : escapeCsvField(participant?.phone || ''),
      participant?.join_code || '',
      `$${(result.prize_amount || 0).toFixed(2)}`,
      participant?.prize_claimed ? 'Claimed' : 'Unclaimed'
    ]
  })

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const datestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const eventName = sanitizeFilename(event.name)
  const filename = `${eventName}-winners-${datestamp}.csv`

  return { csv, filename }
}

async function exportAuditLog(supabase: any, eventId: string, event: any) {
  // Get audit trail from various sources
  const auditEntries = []

  // Event creation
  auditEntries.push({
    timestamp: event.created_at,
    action: 'Event Created',
    details: `Event "${event.name}" created`,
    user: 'System'
  })

  // Participant registrations
  const { data: participants } = await supabase
    .from('patron_entries')
    .select('participant_name, created_at, entry_method')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  participants?.forEach((p: any) => {
    auditEntries.push({
      timestamp: p.created_at,
      action: 'Participant Registered',
      details: `${p.participant_name} registered via ${p.entry_method}`,
      user: p.entry_method === 'manual' ? 'Staff' : 'Self-Registration'
    })
  })

  // Draw assignments
  const { data: assignments } = await supabase
    .from('assignments')
    .select('horse_number, created_at, patron_entries!patron_entry_id(participant_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  assignments?.forEach((a: any) => {
    auditEntries.push({
      timestamp: a.created_at,
      action: 'Horse Assigned',
      details: `Horse ${a.horse_number} assigned to ${a.patron_entries?.participant_name}`,
      user: 'Draw System'
    })
  })

  // Results entry
  const { data: results } = await supabase
    .from('event_results')
    .select('place, horse_number, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  results?.forEach((r: any) => {
    auditEntries.push({
      timestamp: r.created_at,
      action: 'Result Entered',
      details: `Horse ${r.horse_number} finished in place ${r.place}`,
      user: 'Staff'
    })
  })

  // Sort by timestamp
  auditEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // CSV headers
  const headers = [
    'Date',
    'Time',
    'Action',
    'Details',
    'User'
  ]

  const rows = auditEntries.map(entry => {
    const date = new Date(entry.timestamp)
    return [
      date.toLocaleDateString('en-AU'),
      date.toLocaleTimeString('en-AU'),
      escapeCsvField(entry.action),
      escapeCsvField(entry.details),
      escapeCsvField(entry.user)
    ]
  })

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const datestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const eventName = sanitizeFilename(event.name)
  const filename = `${eventName}-audit-log-${datestamp}.csv`

  return { csv, filename }
}

function escapeCsvField(field: string): string {
  if (field == null) return ''

  // Convert to string and handle special characters
  const str = String(field)

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}