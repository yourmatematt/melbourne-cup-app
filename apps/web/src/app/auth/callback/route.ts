import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboard'

  if (code) {
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'

        const redirectUrl = isLocalEnv
          ? `${origin}${next}`
          : forwardedHost
            ? `https://${forwardedHost}${next}`
            : `${origin}${next}`

        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      console.error('Auth callback error:', error)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}