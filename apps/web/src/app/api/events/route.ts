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

    // Log incoming request
    const body = await request.json()
    console.log('📥 Received event creation request:', JSON.stringify(body, null, 2))

    // Validate the request payload
    const validation = eventWithHorsesSchema.safeParse(body)
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues)
      console.error('❌ Received data:', JSON.stringify(body, null, 2))
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.issues
      }, { status: 400 })
    }

    console.log('✅ Validation passed')
    const { event: eventData, horses: horsesData } = validation.data
    console.log('📋 Event data to insert:', JSON.stringify(eventData, null, 2))
    console.log('🐎 Horses data to insert:', JSON.stringify(horsesData, null, 2))

    // Create the event
    console.log('🔄 Creating event in database...')
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (eventError) {
      console.error('❌ Supabase error creating event:', eventError)
      console.error('❌ Error code:', eventError.code)
      console.error('❌ Error message:', eventError.message)
      console.error('❌ Error details:', eventError.details)
      console.error('❌ Error hint:', eventError.hint)
      return NextResponse.json({
        error: 'Failed to create event',
        details: eventError.message
      }, { status: 500 })
    }

    console.log('✅ Event created successfully:', event)

    // Create the horses
    const horsesToInsert = horsesData.map(horse => ({
      event_id: event.id,
      number: horse.number,
      name: horse.name,
      jockey: horse.jockey || null,
      is_scratched: horse.isScratched
    }))

    console.log('🔄 Creating horses in database...')
    console.log('🐎 Horses to insert:', JSON.stringify(horsesToInsert, null, 2))

    const { error: horsesError } = await supabase
      .from('event_horses')
      .insert(horsesToInsert)

    if (horsesError) {
      console.error('❌ Supabase error creating horses:', horsesError)
      console.error('❌ Error code:', horsesError.code)
      console.error('❌ Error message:', horsesError.message)
      console.error('❌ Error details:', horsesError.details)
      console.error('❌ Error hint:', horsesError.hint)

      // Try to clean up the event if horse creation fails
      console.log('🧹 Cleaning up event due to horse creation failure...')
      await supabase.from('events').delete().eq('id', event.id)

      return NextResponse.json({
        error: 'Failed to create event horses',
        details: horsesError.message
      }, { status: 500 })
    }

    console.log('✅ Horses created successfully')
    console.log('🎉 Event creation completed successfully:', event.id)

    return NextResponse.json({ event })
  } catch (error: any) {
    console.error('❌ Unexpected error in POST /api/events:', error)
    console.error('❌ Error name:', error?.name)
    console.error('❌ Error message:', error?.message)
    console.error('❌ Error stack:', error?.stack)

    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}