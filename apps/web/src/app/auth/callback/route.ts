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

  // Create a response to handle cookies properly for PKCE
  let response = NextResponse.next()

  // Create Supabase client with matching cookie configuration for PKCE
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          const cookieValue = request.cookies.get(name)?.value
          console.log(`🍪 Getting cookie "${name}":`, cookieValue ? 'found' : 'missing')
          return cookieValue
        },
        set(name: string, value: string, options: CookieOptions) {
          // Use same cookie options as client
          const cookieOptions = {
            path: '/',
            sameSite: 'lax' as const, // Match client configuration
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true, // Can be true for server-side
            maxAge: 60 * 60 * 24 * 7, // 7 days
            ...options
          }

          console.log(`🍪 Setting server cookie "${name}":`, {
            hasValue: !!value,
            options: cookieOptions
          })

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
          const cookieOptions = {
            path: '/',
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            expires: new Date(0),
            ...options
          }

          console.log(`🗑️ Removing server cookie "${name}"`)

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
    // Debug PKCE-related cookies with detailed analysis
    const allCookies = request.cookies.getAll()
    const supabaseCookies = allCookies.filter(c =>
      c.name.startsWith('sb-') ||
      c.name.includes('pkce') ||
      c.name.includes('auth') ||
      c.name.includes('session')
    )

    console.log('🔄 PKCE Debug - Cookie Analysis:', {
      totalCookies: allCookies.length,
      allCookieNames: allCookies.map(c => c.name),
      supabaseCookies: supabaseCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
        valueStart: c.value?.substring(0, 20) + '...'
      })),
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
      referer: request.headers.get('referer'),
      origin: request.headers.get('origin')
    })

    // Specifically look for key PKCE cookies
    const pkceCodeVerifier = request.cookies.get('sb-pkce-code-verifier')?.value
    const authToken = request.cookies.get('sb-auth-token')?.value
    const refreshToken = request.cookies.get('sb-refresh-token')?.value

    console.log('🔐 PKCE Key Cookies:', {
      pkceCodeVerifier: pkceCodeVerifier ? `present (${pkceCodeVerifier.length} chars)` : 'MISSING',
      authToken: authToken ? `present (${authToken.length} chars)` : 'missing',
      refreshToken: refreshToken ? `present (${refreshToken.length} chars)` : 'missing'
    })

    console.log('🔄 Attempting to exchange code for session with PKCE...')

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

      // Check for specific PKCE errors
      if (exchangeError.message?.includes('code verifier') || exchangeError.message?.includes('PKCE')) {
        console.error('🔐 PKCE Verification Failed - this is likely a cookie/session issue')
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=pkce_failed`)
      }

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

    // Use NextResponse.redirect instead of the response object for redirects
    const redirectResponse = NextResponse.redirect(redirectUrl)

    // Copy any session cookies from our response to the redirect response
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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