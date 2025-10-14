import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UpdateParticipantRequest {
  payment_status?: 'paid' | 'pending' | 'expired'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string; participantId: string } }
) {
  const supabase = createClient()

  try {
    const { eventId, participantId } = params
    const body: UpdateParticipantRequest = await request.json()

    console.log('Payment status update request:', { eventId, participantId, body })

    // Validate required fields
    if (!body.payment_status) {
      return NextResponse.json(
        { success: false, error: 'Payment status is required' },
        { status: 400 }
      )
    }

    // Validate payment status values
    if (!['paid', 'pending', 'expired'].includes(body.payment_status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment status' },
        { status: 400 }
      )
    }

    // Find the participant entry
    const { data: participant, error: findError } = await supabase
      .from('patron_entries')
      .select('id, participant_name, payment_status, event_id')
      .eq('id', participantId)
      .eq('event_id', eventId)
      .single()

    if (findError || !participant) {
      console.error('Participant not found:', findError)
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Update payment status
    const updateData: any = {
      payment_status: body.payment_status,
      updated_at: new Date().toISOString()
    }

    // Set paid_at timestamp when marking as paid
    if (body.payment_status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }

    const { data: updatedParticipant, error: updateError } = await supabase
      .from('patron_entries')
      .update(updateData)
      .eq('id', participantId)
      .select('id, participant_name, payment_status, paid_at')
      .single()

    if (updateError) {
      console.error('Payment status update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update payment status' },
        { status: 500 }
      )
    }

    console.log('Payment status updated:', updatedParticipant)

    return NextResponse.json({
      success: true,
      data: updatedParticipant,
      message: `Payment status updated to ${body.payment_status} for ${updatedParticipant.participant_name}`
    })

  } catch (error) {
    console.error('Update participant API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}