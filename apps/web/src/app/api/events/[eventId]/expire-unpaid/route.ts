import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params

    console.log('🔍 Expiring unpaid entries for event:', eventId)

    // Use the database function to expire unpaid entries
    const { data: expiredCount, error: expireError } = await supabase
      .rpc('expire_unpaid_entries')

    if (expireError) {
      console.error('Error expiring unpaid entries:', expireError)
      return NextResponse.json(
        { success: false, error: 'Failed to expire unpaid entries' },
        { status: 500 }
      )
    }

    console.log(`✅ Expired ${expiredCount} unpaid entries`)

    // Get current event stats after expiry
    const { data: paidCount, error: paidError } = await supabase
      .rpc('get_paid_participant_count', { event_uuid: eventId })

    const { data: pendingCount, error: pendingError } = await supabase
      .rpc('get_pending_participant_count', { event_uuid: eventId })

    if (paidError || pendingError) {
      console.error('Error getting participant counts:', { paidError, pendingError })
    }

    return NextResponse.json({
      success: true,
      data: {
        expiredCount,
        currentStats: {
          paidCount: paidCount || 0,
          pendingCount: pendingCount || 0,
          totalActive: (paidCount || 0) + (pendingCount || 0)
        }
      }
    })

  } catch (error) {
    console.error('Expire unpaid entries API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check for entries that need expiring (without actually expiring them)
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params

    // Find entries that should be expired but aren't yet
    const { data: expirableEntries, error: findError } = await supabase
      .from('patron_entries')
      .select(`
        id,
        participant_name,
        join_code,
        payment_deadline,
        payment_amount,
        created_at
      `)
      .eq('event_id', eventId)
      .eq('payment_status', 'pending')
      .lt('payment_deadline', new Date().toISOString())

    if (findError) {
      console.error('Error finding expirable entries:', findError)
      return NextResponse.json(
        { success: false, error: 'Failed to check expirable entries' },
        { status: 500 }
      )
    }

    // Get current stats
    const { data: paidCount, error: paidError } = await supabase
      .rpc('get_paid_participant_count', { event_uuid: eventId })

    const { data: pendingCount, error: pendingError } = await supabase
      .rpc('get_pending_participant_count', { event_uuid: eventId })

    return NextResponse.json({
      success: true,
      data: {
        expirableEntries: expirableEntries || [],
        expirableCount: expirableEntries?.length || 0,
        currentStats: {
          paidCount: paidCount || 0,
          pendingCount: pendingCount || 0,
          totalActive: (paidCount || 0) + (pendingCount || 0)
        }
      }
    })

  } catch (error) {
    console.error('Check expirable entries API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}