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
  console.log('🚨 POST HANDLER CALLED')

  try {
    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Log incoming request
    const body = await request.json()
    console.log('📥 Received raw body:', JSON.stringify(body, null, 2))
    console.log('📥 Body keys:', Object.keys(body))
    console.log('📥 Body structure check:')
    console.log('  - has event property:', 'event' in body)
    console.log('  - has horses property:', 'horses' in body)

    if ('event' in body) {
      console.log('  - event keys:', Object.keys(body.event))
    }
    if ('horses' in body) {
      console.log('  - horses length:', Array.isArray(body.horses) ? body.horses.length : 'not an array')
    }

    // Validate the request payload
    console.log('🔍 Starting validation with eventWithHorsesSchema...')
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
    return NextResponse.json({ success: true, message: 'Validation passed' }, { status: 200 })

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