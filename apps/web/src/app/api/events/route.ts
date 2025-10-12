import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { eventWithHorsesSchema } from '@/lib/event-schemas'

export async function GET(request: Request) {
  try {
    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('events')
      .select('id,name,starts_at,status,capacity,mode,created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()

    // Validate the request payload
    const validation = eventWithHorsesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { event: eventData, horses: horsesData } = validation.data

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (eventError) {
      console.error('Event creation error:', eventError)
      return NextResponse.json({
        error: 'Failed to create event',
        details: eventError.message
      }, { status: 500 })
    }

    // Create the horses
    const horsesToInsert = horsesData.map(horse => ({
      event_id: event.id,
      number: horse.number,
      name: horse.name,
      jockey: horse.jockey || null,
      is_scratched: horse.isScratched
    }))

    const { error: horsesError } = await supabase
      .from('event_horses')
      .insert(horsesToInsert)

    if (horsesError) {
      console.error('Horses creation error:', horsesError)
      // Try to clean up the event if horse creation fails
      await supabase.from('events').delete().eq('id', event.id)
      return NextResponse.json({
        error: 'Failed to create event horses',
        details: horsesError.message
      }, { status: 500 })
    }

    return NextResponse.json({ event })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}