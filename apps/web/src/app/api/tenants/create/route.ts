import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { userId, venueName, email } = body

    if (!userId || !venueName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, venueName, email' },
        { status: 400 }
      )
    }

    // Generate slug from email (remove domain and special chars)
    const emailUsername = email.split('@')[0]
    const baseSlug = emailUsername.toLowerCase().replace(/[^a-z0-9]/g, '-')

    // Ensure slug is unique by checking existing tenants
    let slug = baseSlug
    let counter = 1

    while (true) {
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existingTenant) {
        break // Slug is available
      }

      slug = `${baseSlug}-${counter}`
      counter++
    }

    console.log('🏢 Creating tenant with service role:', {
      name: venueName,
      slug: slug,
      userId: userId
    })

    // Create tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: venueName,
        slug: slug,
        billing_status: 'trial'
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Failed to create tenant:', tenantError)
      return NextResponse.json(
        { error: 'Failed to create tenant' },
        { status: 500 }
      )
    }

    console.log('✅ Tenant created:', {
      id: tenantData.id,
      name: tenantData.name,
      slug: tenantData.slug
    })

    // Link user to tenant
    const { error: tenantUserError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantData.id,
        user_id: userId,
        role: 'owner'
      })

    if (tenantUserError) {
      console.error('Failed to link user to tenant:', tenantUserError)
      return NextResponse.json(
        { error: 'Failed to link user to tenant' },
        { status: 500 }
      )
    }

    console.log('✅ User linked to tenant as owner')

    return NextResponse.json({
      data: {
        tenant: tenantData,
        message: 'Tenant created successfully'
      }
    })

  } catch (error: any) {
    console.error('Tenant creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}