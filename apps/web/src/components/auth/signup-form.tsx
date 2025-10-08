'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient, debugAuthCookies } from '@/lib/supabase/client'
import { signupSchema, type SignupFormData } from '@/lib/auth-schemas'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

interface DebugInfo {
  timestamp: string
  cookiesCreated: number
  flowStateCookieExists: boolean
  pkceCookieExists: boolean
  allSbCookies: string[]
  browserInfo: {
    domain: string
    path: string
    isSecure: boolean
  }
}

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Function to parse cookies and create debug info
  const createDebugInfo = (): DebugInfo => {
    const allCookies = document.cookie.split(';').map(c => c.trim()).filter(c => c)
    const sbCookies = allCookies
      .filter(c => c.includes('sb-') || c.includes('supabase'))
      .map(c => c.split('=')[0])

    // More comprehensive flow state cookie detection
    const flowStateCookieExists = allCookies.some(c => {
      const cookieName = c.split('=')[0].toLowerCase()
      return cookieName.includes('flow') ||
             cookieName.includes('auth-token') ||
             (cookieName.includes('sb-') && cookieName.includes('auth'))
    })

    // More comprehensive PKCE cookie detection
    const pkceCookieExists = allCookies.some(c => {
      const cookieName = c.split('=')[0].toLowerCase()
      return cookieName.includes('pkce') ||
             cookieName.includes('verifier') ||
             cookieName.includes('code-verifier')
    })

    return {
      timestamp: new Date().toISOString(),
      cookiesCreated: allCookies.length,
      flowStateCookieExists,
      pkceCookieExists,
      allSbCookies: sbCookies,
      browserInfo: {
        domain: window.location.hostname,
        path: window.location.pathname,
        isSecure: window.location.protocol === 'https:'
      }
    }
  }

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      venueName: '',
      acceptTerms: false
    }
  })

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true)
    setError(null)

    try {
      console.log('Attempting signup with:', {
        email: data.email,
        redirectTo: `${window.location.origin}/auth/callback`,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      })

      // Sign up the user with email confirmation using PKCE flow
      const redirectUrl = `${window.location.origin}/auth/callback`
      console.log('🔐 Configuring PKCE signup with redirect:', redirectUrl)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.venueName
          },
          emailRedirectTo: redirectUrl,
          // Explicitly enable PKCE flow for email verification
          captchaToken: undefined // Ensure no captcha interference
        }
      })

      console.log('🔐 PKCE signup response:', {
        user: authData.user ? 'created' : 'none',
        session: authData.session ? 'active' : 'none',
        error: authError?.message
      })

      console.log('Signup response:', { authData, authError })

      if (authError) {
        console.error('Signup auth error:', authError)
        throw authError
      }

      if (!authData.user) {
        console.error('No user returned from signup')
        throw new Error('Failed to create user account')
      }

      // Log whether email confirmation is required
      console.log('User created:', {
        id: authData.user.id,
        email: authData.user.email,
        emailConfirmed: authData.user.email_confirmed_at,
        confirmationSentAt: authData.user.confirmation_sent_at
      })

      // Check cookies immediately after signup
      console.log('🍪 Checking cookies immediately after signUp call...')
      const immediateDebug = createDebugInfo()
      console.log('🍪 Immediate cookie check:', immediateDebug)

      // Create visible debug info after signup with multiple checks
      setTimeout(() => {
        const debug = createDebugInfo()
        setDebugInfo(debug)
        setShowDebug(true)

        // Additional analysis for flow state cookie
        if (!debug.flowStateCookieExists) {
          console.error('❌ FLOW STATE COOKIE MISSING after signup!')
          console.error('🔍 This indicates PKCE flow configuration issue')
          console.error('🔍 Expected flow state cookie patterns:', [
            'sb-*-auth-token-code-verifier',
            'sb-*-auth-token',
            'sb-*-pkce-code-verifier'
          ])
        } else {
          console.log('✅ Flow state cookie found - PKCE should work')
        }
      }, 1000) // Increased delay to ensure all cookies are set

      // Redirect to check email page (tenant creation happens during onboarding after email verification)
      router.push(`/auth/check-email?email=${encodeURIComponent(data.email)}`)
    } catch (err) {
      console.error('Signup error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Visible Debug Panel */}
      {showDebug && debugInfo && (
        <div className="fixed top-4 left-4 right-4 z-50 p-4 bg-yellow-50 border-4 border-red-500 rounded-lg shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-red-700">🔍 AUTH DEBUG INFO</h3>
            <button
              onClick={() => setShowDebug(false)}
              className="text-red-500 hover:text-red-700 font-bold text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div><strong>Signup attempted at:</strong> {debugInfo.timestamp}</div>
            <div><strong>Total cookies created:</strong> {debugInfo.cookiesCreated}</div>
            <div><strong>Flow state cookie exists:</strong>
              <span className={debugInfo.flowStateCookieExists ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {debugInfo.flowStateCookieExists ? ' YES' : ' NO'}
              </span>
            </div>
            <div><strong>PKCE cookie exists:</strong>
              <span className={debugInfo.pkceCookieExists ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {debugInfo.pkceCookieExists ? ' YES' : ' NO'}
              </span>
            </div>

            {debugInfo.allSbCookies.length > 0 ? (
              <div>
                <strong>Supabase cookies found ({debugInfo.allSbCookies.length}):</strong>
                <ul className="ml-4 mt-1">
                  {debugInfo.allSbCookies.map((cookie, index) => {
                    const isAuthToken = cookie.toLowerCase().includes('auth')
                    const isVerifier = cookie.toLowerCase().includes('verifier') || cookie.toLowerCase().includes('pkce')
                    return (
                      <li key={index} className={`font-mono text-xs ${isAuthToken ? 'text-blue-600 font-bold' : isVerifier ? 'text-green-600 font-bold' : ''}`}>
                        {cookie} {isAuthToken ? '(AUTH)' : isVerifier ? '(VERIFIER)' : ''}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <div className="text-red-600 font-bold">⚠️ NO SUPABASE COOKIES FOUND!</div>
            )}

            <div className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded text-xs">
              <strong>Expected cookies for PKCE flow:</strong>
              <ul className="ml-2 mt-1">
                <li>• <code>sb-*-auth-token</code> (flow state)</li>
                <li>• <code>sb-*-pkce-code-verifier</code> (verification)</li>
              </ul>
            </div>

            <div className="mt-4 pt-2 border-t border-gray-300">
              <strong>Browser info:</strong>
              <div className="ml-4 font-mono text-xs">
                <div>Domain: {debugInfo.browserInfo.domain}</div>
                <div>Path: {debugInfo.browserInfo.path}</div>
                <div>Secure: {debugInfo.browserInfo.isSecure ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

        <FormField
          control={form.control}
          name="venueName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Name</FormLabel>
              <FormControl>
                <Input placeholder="The Crown Hotel" {...field} />
              </FormControl>
              <FormDescription>
                The name of your venue or business
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="manager@venue.com"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This will be your login email address
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>
                Must be at least 6 characters long
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I accept the{' '}
                  <a href="/terms" className="underline hover:text-primary">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="underline hover:text-primary">
                    Privacy Policy
                  </a>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
    </Form>
    </div>
  )
}