import { createBrowserClient } from '@supabase/ssr'

// Debug helper for magic link authentication cookies
export function debugAuthCookies() {
  const allCookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=')
    if (name) acc[name] = value
    return acc
  }, {} as Record<string, string>)

  const authCookies = Object.keys(allCookies).filter(name =>
    name.includes('sb-') || name.includes('supabase')
  )

  console.log('🔗 Magic link auth cookies:', {
    total: authCookies.length,
    cookies: authCookies.map(name => ({
      name,
      hasValue: !!allCookies[name],
      length: allCookies[name]?.length || 0,
      isAuthToken: name.includes('auth-token')
    }))
  })

  return {
    allAuthCookies: authCookies,
    total: authCookies.length
  }
}

export function createClient() {
  // createBrowserClient with minimal configuration for simple password authentication
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true
        // Minimal configuration - let Supabase handle everything with defaults
      }
      // No custom cookie configuration - use Supabase defaults for password auth
    }
  )
}