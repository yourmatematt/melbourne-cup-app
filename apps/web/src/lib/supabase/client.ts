import { createBrowserClient } from '@supabase/ssr'

// Debug helper to log all auth-related cookies
export function debugAuthCookies() {
  // This function is only called from client components, so safe to access document
  const allCookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=')
    if (name) acc[name] = value
    return acc
  }, {} as Record<string, string>)

  const authCookies = Object.keys(allCookies).filter(name =>
    name.includes('supabase') ||
    name.includes('flow') ||
    name.includes('verifier') ||
    name.includes('token') ||
    name.includes('sb-')
  )

  console.log('🔍 All auth-related cookies:', {
    total: authCookies.length,
    cookies: authCookies.map(name => ({
      name,
      hasValue: !!allCookies[name],
      length: allCookies[name]?.length || 0
    }))
  })

  // Check for specific flow state patterns
  const flowStateCookies = authCookies.filter(name => name.includes('flow'))
  const verifierCookies = authCookies.filter(name => name.includes('verifier'))

  console.log('🌊 Flow state analysis:', {
    flowStateCookies: flowStateCookies.length,
    verifierCookies: verifierCookies.length,
    details: {
      flowStates: flowStateCookies,
      verifiers: verifierCookies
    }
  })

  return {
    allAuthCookies: authCookies,
    flowStateCookies,
    verifierCookies,
    total: authCookies.length
  }
}

export function createClient() {
  // createBrowserClient is only used on the client side, so we can safely access document
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      },
      cookies: {
        get(name: string) {
          try {
            // Get cookie from document.cookie
            const value = `; ${document.cookie}`
            const parts = value.split(`; ${name}=`)
            const cookieValue = parts.length === 2 ? parts.pop()?.split(';').shift() : undefined

            // Enhanced logging for auth flow debugging
            console.log('🔍 Getting cookie:', {
              name,
              found: !!cookieValue,
              value: cookieValue ? 'present' : 'missing',
              isAuthFlow: name.includes('flow') || name.includes('verifier') || name.includes('token')
            })

            return cookieValue
          } catch (error) {
            console.error('❌ Cookie get error:', { name, error: error.message })
            return undefined
          }
        },
        set(name: string, value: string, options: any) {
          try {
            // Enhanced cookie options for auth flow
            const cookieOptions = {
              path: '/',
              sameSite: 'lax' as const, // Critical for email verification links
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false, // Must be false for browser client
              maxAge: 60 * 60 * 24 * 7, // 7 days
              ...options
            }

            let cookieString = `${name}=${encodeURIComponent(value)}`

            Object.entries(cookieOptions).forEach(([key, val]) => {
              if (val === true) {
                cookieString += `; ${key}`
              } else if (val !== false && val !== undefined) {
                cookieString += `; ${key}=${val}`
              }
            })

            document.cookie = cookieString

            // Verify cookie was set
            const verification = document.cookie.includes(`${name}=`)

            // Enhanced logging for auth flow debugging
            const isAuthFlow = name.includes('flow') || name.includes('verifier') || name.includes('token')
            console.log('🍪 Setting cookie:', {
              name,
              hasValue: !!value,
              isAuthFlow,
              verified: verification,
              options: cookieOptions,
              cookieString: cookieString.substring(0, 100) + (cookieString.length > 100 ? '...' : '')
            })

            // Critical error logging for auth flow cookies
            if (isAuthFlow && !verification) {
              console.error(`🚨 CRITICAL: Auth flow cookie "${name}" failed to set! This will break authentication.`)
            }
          } catch (error) {
            const errorMsg = `❌ Cookie set error for "${name}": ${error.message}`
            console.error(errorMsg, { name, hasValue: !!value, error })
          }
        },
        remove(name: string, options: any) {
          try {
            // Remove cookie by setting expired date
            const cookieOptions = {
              path: '/',
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
              expires: new Date(0),
              ...options
            }

            let cookieString = `${name}=`

            Object.entries(cookieOptions).forEach(([key, val]) => {
              if (val === true) {
                cookieString += `; ${key}`
              } else if (val !== false && val !== undefined) {
                cookieString += `; ${key}=${val}`
              }
            })

            document.cookie = cookieString

            // Verify cookie was removed
            const stillExists = document.cookie.includes(`${name}=`)

            console.log('🗑️ Removing cookie:', {
              name,
              options: cookieOptions,
              stillExists,
              success: !stillExists
            })

            if (stillExists) {
              console.warn('⚠️ Cookie removal may have failed:', name)
            }
          } catch (error) {
            console.error('❌ Cookie remove error:', { name, error: error.message })
          }
        }
      }
    }
  )
}