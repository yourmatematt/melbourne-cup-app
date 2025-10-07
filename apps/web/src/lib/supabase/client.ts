import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined'

  // Create browser client with proper cookie configuration for PKCE
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Only access document.cookie in browser environment
          if (!isBrowser) return undefined

          // Get cookie from document.cookie
          const value = `; ${document.cookie}`
          const parts = value.split(`; ${name}=`)
          if (parts.length === 2) {
            return parts.pop()?.split(';').shift()
          }
        },
        set(name: string, value: string, options: any) {
          // Only set cookies in browser environment
          if (!isBrowser) return

          // Set cookie with proper options for PKCE persistence
          const cookieOptions = {
            path: '/',
            sameSite: 'lax' as const, // Allow cross-site navigation (email links)
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false, // Must be false for browser client
            maxAge: 60 * 60 * 24 * 7, // 7 days
            ...options
          }

          let cookieString = `${name}=${value}`

          Object.entries(cookieOptions).forEach(([key, val]) => {
            if (val === true) {
              cookieString += `; ${key}`
            } else if (val !== false && val !== undefined) {
              cookieString += `; ${key}=${val}`
            }
          })

          document.cookie = cookieString

          // Debug logging for cookie setting
          console.log('🍪 Setting cookie:', {
            name,
            hasValue: !!value,
            options: cookieOptions,
            cookieString: cookieString.substring(0, 100) + '...'
          })
        },
        remove(name: string, options: any) {
          // Only remove cookies in browser environment
          if (!isBrowser) return

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

          console.log('🗑️ Removing cookie:', { name, options: cookieOptions })
        }
      }
    }
  )
}