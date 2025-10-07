import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UndoRequest {
  count?: number // Number of assignments to undo (optional - if not provided, undoes all)
  reason?: string // Reason for undo (for audit trail)
}

interface UndoResponse {
  success: boolean
  deletedCount?: number
  auditLogId?: string
  eventStatusReset?: boolean
  remainingAssignments?: number
  error?: string
}

// Broadcast undo results to realtime channel
async function broadcastUndoResults(
  supabase: any,
  eventId: string,
  deletedCount: number,
  eventStatusReset: boolean
) {
  try {
    await supabase
      .channel(`event_${eventId}`)
      .send({
        type: 'broadcast',
        event: 'draw_undone',
        payload: {
          eventId,
          deletedAssignments: deletedCount,
          eventStatusReset,
          timestamp: new Date().toISOString()
        }
      })
  } catch (error) {
    console.error('Failed to broadcast undo results:', error)
    // Don't throw - this is not critical for the undo operation
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const body: UndoRequest = await request.json()
    const { count, reason } = body

    // Validate event exists
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

    // Check if there are assignments to undo
    const { data: existingAssignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, draw_order')
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('draw_order', { ascending: false })

    if (assignmentsError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch assignments: ${assignmentsError.message}` },
        { status: 500 }
      )
    }

    if (!existingAssignments || existingAssignments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assignments found to undo' },
        { status: 400 }
      )
    }

    // Validate count if provided
    if (count && (count <= 0 || count > existingAssignments.length)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid count. Must be between 1 and ${existingAssignments.length}`
        },
        { status: 400 }
      )
    }

    // Execute undo transaction
    const { data: undoResult, error: undoError } = await supabase.rpc(
      'undo_draw_assignments',
      {
        p_event_id: eventId,
        p_assignment_count: count || null
      }
    )

    if (undoError) {
      return NextResponse.json(
        { success: false, error: `Undo failed: ${undoError.message}` },
        { status: 500 }
      )
    }

    if (!undoResult.success) {
      return NextResponse.json(
        { success: false, error: 'Undo operation failed' },
        { status: 500 }
      )
    }

    // Add additional audit log entry with reason if provided
    if (reason) {
      await supabase
        .from('audit_logs')
        .insert({
          event_id: eventId,
          action: 'draw_undo_reason',
          details: {
            reason,
            deleted_count: undoResult.deleted_count,
            timestamp: new Date().toISOString()
          }
        })
    }

    // Get remaining assignments count
    const { count: remainingCount } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .is('deleted_at', null)

    // Broadcast undo results
    await broadcastUndoResults(
      supabase,
      eventId,
      undoResult.deleted_count,
      undoResult.event_status_reset
    )

    return NextResponse.json({
      success: true,
      deletedCount: undoResult.deleted_count,
      auditLogId: undoResult.audit_log_id,
      eventStatusReset: undoResult.event_status_reset,
      remainingAssignments: remainingCount || 0
    })

  } catch (error) {
    console.error('Undo operation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check what can be undone
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params

    // Get current assignments that can be undone
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        id,
        draw_order,
        created_at,
        patron_entries!patron_entry_id (
          participant_name
        ),
        event_horses!event_horse_id (
          number,
          name
        )
      `)
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('draw_order', { ascending: false })

    if (assignmentsError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch assignments: ${assignmentsError.message}` },
        { status: 500 }
      )
    }

    // Get recent undo history
    const { data: undoHistory } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('event_id', eventId)
      .eq('action', 'draw_undone')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      undoableAssignments: assignments?.length || 0,
      lastAssignments: assignments?.slice(0, 10) || [], // Show last 10 for preview
      undoHistory: undoHistory || [],
      canUndo: (assignments?.length || 0) > 0
    })

  } catch (error) {
    console.error('Get undo status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}