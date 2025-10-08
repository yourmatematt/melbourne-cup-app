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
  // createBrowserClient with simplified configuration for magic link authentication
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: 'sb-auth-token' // Ensure consistent storage key for magic link tokens
        // No flowType specified - let Supabase handle magic link flow automatically
      }
      // No custom cookie configuration - let Supabase use default document.cookie handling
      // This ensures compatibility with magic link session tokens created by auth callback
    }
  )
}