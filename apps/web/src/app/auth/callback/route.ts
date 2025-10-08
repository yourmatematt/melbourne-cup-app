import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

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

  // Simple logging for magic link flow

  // Logging for magic link authentication
  console.log('🔗 Magic link callback received:', {
    hasCode: !!code,
    hasError: !!error,
    type,
    next,
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

  // Create response to handle cookies properly for magic link PKCE
  let response = NextResponse.next()

  // Debug incoming cookies for PKCE verification
  const allCookies = request.cookies.getAll()
  const pkceCookies = allCookies.filter(c =>
    c.name.includes('pkce') ||
    c.name.includes('verifier') ||
    c.name.includes('code-verifier') ||
    c.name.startsWith('sb-')
  )

  console.log('🔗 Magic link PKCE cookies on server:', {
    totalCookies: allCookies.length,
    pkceCookies: pkceCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0
    }))
  })

  // Create Supabase client with proper cookie handling for magic link PKCE
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          const cookieValue = request.cookies.get(name)?.value
          console.log(`🍪 Server reading cookie "${name}":`, {
            found: !!cookieValue,
            length: cookieValue?.length || 0
          })
          return cookieValue
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`🍪 Server setting cookie "${name}"`)

          const cookieOptions = {
            ...options,
            path: '/',
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false // Important: magic link cookies need to be accessible to client
          }

          // Set on both request and response
          request.cookies.set({
            name,
            value,
            ...cookieOptions,
          })

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          response.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
        },
        remove(name: string, options: CookieOptions) {
          console.log(`🗑️ Server removing cookie "${name}"`)

          const cookieOptions = {
            ...options,
            path: '/',
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            expires: new Date(0)
          }

          // Remove from both request and response
          request.cookies.set({
            name,
            value: '',
            ...cookieOptions,
          })

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          response.cookies.set({
            name,
            value: '',
            ...cookieOptions,
          })
        },
      },
    }
  )

  try {
    // Check for specific PKCE cookies before exchange
    const pkceCodeVerifier = request.cookies.get('sb-pkce-code-verifier')?.value
    const codeVerifierCookies = allCookies.filter(c => c.name.includes('code-verifier'))

    console.log('🔗 PKCE verification check:', {
      hasPkceCodeVerifier: !!pkceCodeVerifier,
      pkceCodeVerifierLength: pkceCodeVerifier?.length || 0,
      codeVerifierCookies: codeVerifierCookies.map(c => c.name),
      totalRelevantCookies: pkceCookies.length
    })

    console.log('🔗 Attempting to exchange magic link code for session...')

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    console.log('📋 Magic link exchange result:', {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userEmail: data.user?.email,
      userConfirmed: data.user?.email_confirmed_at,
      sessionExpiry: data.session?.expires_at,
      error: exchangeError?.message
    })

    if (exchangeError) {
      console.error('❌ Magic link code exchange failed:', {
        message: exchangeError.message,
        status: exchangeError.status
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

    // Success - prepare redirect with session cookies
    const redirectUrl = `${origin}${next}`

    console.log('✅ Magic link authentication successful, redirecting to:', {
      redirectUrl,
      userEmail: data.user.email,
      userId: data.user.id
    })

    // Create redirect response and copy any session cookies
    const redirectResponse = NextResponse.redirect(redirectUrl)

    // Copy cookies from our working response to the redirect response
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false, // Important: keep accessible to client for magic link flow
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })
    })

    return redirectResponse

  } catch (error) {
    console.error('💥 Unexpected error in auth callback:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code
    })

    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=unexpected_error`)
  }
}