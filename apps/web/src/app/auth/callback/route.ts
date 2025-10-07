import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // Extract all possible parameters from the callback URL
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const tokenType = searchParams.get('token_type')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/onboard'

  // Comprehensive logging of incoming parameters
  console.log('🔍 Auth callback received:', {
    url: request.url,
    code: code ? `${code.substring(0, 10)}...` : null, // Log partial code for security
    error,
    errorCode,
    errorDescription,
    accessToken: accessToken ? 'present' : null,
    refreshToken: refreshToken ? 'present' : null,
    tokenType,
    type,
    next,
    origin,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  })

  // Handle explicit error from Supabase
  if (error) {
    console.error('❌ Supabase returned error in callback:', {
      error,
      errorCode,
      errorDescription
    })

    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(errorDescription || error)}`)
  }

  // Handle missing code
  if (!code) {
    console.error('❌ No authorization code provided in callback')
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
  }

  // Validate Supabase configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    })

    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=configuration_error`)
  }

  const supabase = createClient()

  try {
    console.log('🔄 Attempting to exchange code for session...')

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    console.log('📋 Code exchange result:', {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userEmail: data.user?.email,
      userConfirmed: data.user?.email_confirmed_at,
      userCreated: data.user?.created_at,
      sessionExpiry: data.session?.expires_at,
      error: exchangeError
    })

    if (exchangeError) {
      console.error('❌ Code exchange failed:', {
        message: exchangeError.message,
        status: exchangeError.status,
        details: exchangeError
      })

      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError.message)}`)
    }

    if (!data.session || !data.user) {
      console.error('❌ No session or user returned from code exchange:', {
        hasSession: !!data.session,
        hasUser: !!data.user
      })

      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_session`)
    }

    // Verify user email is confirmed
    if (!data.user.email_confirmed_at) {
      console.error('❌ User email not confirmed:', {
        userEmail: data.user.email,
        emailConfirmed: data.user.email_confirmed_at
      })

      return NextResponse.redirect(`${origin}/auth/check-email?email=${encodeURIComponent(data.user.email || '')}`)
    }

    // Success - prepare redirect
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    const redirectUrl = isLocalEnv
      ? `${origin}${next}`
      : forwardedHost
        ? `https://${forwardedHost}${next}`
        : `${origin}${next}`

    console.log('✅ Email verification successful, redirecting to:', {
      redirectUrl,
      userEmail: data.user.email,
      userId: data.user.id
    })

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('💥 Unexpected error in auth callback:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code
    })

    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=unexpected_error`)
  }
}