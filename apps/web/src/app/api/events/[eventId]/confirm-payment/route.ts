import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ConfirmPaymentRequest {
  joinCode?: string
  participantId?: string
  amount?: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const body: ConfirmPaymentRequest = await request.json()

    console.log('🔍 Payment confirmation request:', { eventId, body })

    // Validate required fields
    if (!body.joinCode && !body.participantId) {
      return NextResponse.json(
        { success: false, error: 'Join code or participant ID is required' },
        { status: 400 }
      )
    }

    // Find the participant entry with event promo info
    let query = supabase
      .from('patron_entries')
      .select(`
        id,
        participant_name,
        join_code,
        payment_status,
        payment_deadline,
        payment_amount,
        event_id,
        created_at,
        events!event_id (
          promo_enabled,
          promo_duration,
          payment_timeout_minutes
        )
      `)
      .eq('event_id', eventId)

    if (body.joinCode) {
      query = query.eq('join_code', body.joinCode.toUpperCase())
    } else if (body.participantId) {
      query = query.eq('id', body.participantId)
    }

    const { data: participant, error: findError } = await query.single()

    if (findError || !participant) {
      console.error('Participant not found:', findError)
      return NextResponse.json(
        { success: false, error: 'Participant not found with that join code' },
        { status: 404 }
      )
    }

    // Check if already paid
    if (participant.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment already confirmed for this participant' },
        { status: 400 }
      )
    }

    // Check if expired
    if (participant.payment_status === 'expired') {
      return NextResponse.json(
        { success: false, error: 'This reservation has expired' },
        { status: 400 }
      )
    }

    // Check if deadline has passed (but status hasn't been updated yet)
    if (participant.payment_deadline && new Date(participant.payment_deadline) < new Date()) {
      // Mark as expired first
      await supabase
        .from('patron_entries')
        .update({
          payment_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', participant.id)

      return NextResponse.json(
        { success: false, error: 'This reservation has expired' },
        { status: 400 }
      )
    }

    // Check if payment qualifies for promo
    const now = new Date()
    const entryCreatedAt = new Date(participant.created_at)
    const event = participant.events

    let promoClaimed = false
    if (event.promo_enabled) {
      const promoDuration = event.promo_duration || event.payment_timeout_minutes || 15
      const promoDeadline = new Date(entryCreatedAt.getTime() + promoDuration * 60 * 1000)

      if (now <= promoDeadline) {
        promoClaimed = true
        console.log(`🎉 Promo claimed! Payment within ${promoDuration} minutes of registration.`)
      }
    }

    // Confirm payment with promo status
    const { data: updatedParticipant, error: updateError } = await supabase
      .from('patron_entries')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_amount: body.amount || participant.payment_amount,
        promo_claimed: promoClaimed,
        updated_at: new Date().toISOString()
      })
      .eq('id', participant.id)
      .select('id, participant_name, join_code, payment_status, paid_at, payment_amount, promo_claimed')
      .single()

    if (updateError) {
      console.error('Payment confirmation error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to confirm payment' },
        { status: 500 }
      )
    }

    const promoMessage = promoClaimed
      ? ' 🎉 Promotional offer claimed!'
      : ''

    console.log('✅ Payment confirmed:', updatedParticipant)

    return NextResponse.json({
      success: true,
      data: {
        participant: updatedParticipant,
        promoClaimed,
        message: `Payment confirmed for ${updatedParticipant.participant_name}${promoMessage}`
      }
    })

  } catch (error) {
    console.error('Payment confirmation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to find participant by join code (for staff lookup)
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const joinCode = searchParams.get('joinCode')

    if (!joinCode) {
      return NextResponse.json(
        { success: false, error: 'Join code is required' },
        { status: 400 }
      )
    }

    // Find participant by join code with promo info
    const { data: participant, error: findError } = await supabase
      .from('patron_entries')
      .select(`
        id,
        participant_name,
        email,
        phone,
        join_code,
        payment_status,
        payment_deadline,
        payment_amount,
        paid_at,
        created_at,
        promo_claimed,
        events!event_id (
          promo_enabled,
          promo_message,
          promo_duration,
          payment_timeout_minutes
        )
      `)
      .eq('event_id', eventId)
      .eq('join_code', joinCode.toUpperCase())
      .single()

    if (findError || !participant) {
      return NextResponse.json(
        { success: false, error: 'Participant not found with that join code' },
        { status: 404 }
      )
    }

    // Calculate time remaining if pending
    let timeRemaining = null
    let isExpired = false
    let promoTimeRemaining = null
    let promoExpired = false

    const now = new Date()

    if (participant.payment_status === 'pending' && participant.payment_deadline) {
      const deadline = new Date(participant.payment_deadline)
      const remaining = deadline.getTime() - now.getTime()

      if (remaining <= 0) {
        isExpired = true
      } else {
        timeRemaining = {
          minutes: Math.floor(remaining / (1000 * 60)),
          seconds: Math.floor((remaining % (1000 * 60)) / 1000),
          total: remaining
        }
      }
    }

    // Calculate promo time remaining if applicable
    const event = participant.events
    if (event.promo_enabled && !participant.promo_claimed && participant.payment_status === 'pending') {
      const promoDuration = event.promo_duration || event.payment_timeout_minutes || 15
      const promoDeadline = new Date(new Date(participant.created_at).getTime() + promoDuration * 60 * 1000)
      const promoRemaining = promoDeadline.getTime() - now.getTime()

      if (promoRemaining <= 0) {
        promoExpired = true
      } else {
        promoTimeRemaining = {
          minutes: Math.floor(promoRemaining / (1000 * 60)),
          seconds: Math.floor((promoRemaining % (1000 * 60)) / 1000),
          total: promoRemaining
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        participant,
        timeRemaining,
        isExpired,
        promo: {
          enabled: event.promo_enabled,
          message: event.promo_message,
          timeRemaining: promoTimeRemaining,
          expired: promoExpired,
          claimed: participant.promo_claimed
        }
      }
    })

  } catch (error) {
    console.error('Participant lookup API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}