'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface CheckEmailDebugInfo {
  pageLoadTime: string
  cookiesFound: number
  flowStateCookieExists: boolean
  pkceCookieExists: boolean
  allSbCookies: string[]
  browserInfo: {
    domain: string
    path: string
    isSecure: boolean
  }
}

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const supabase = createClient()

  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' })
  const [debugInfo, setDebugInfo] = useState<CheckEmailDebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(true) // Show by default on this page

  // Function to parse cookies and create debug info
  const createDebugInfo = (): CheckEmailDebugInfo => {
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
      pageLoadTime: new Date().toISOString(),
      cookiesFound: allCookies.length,
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

  // Create debug info on page load
  useEffect(() => {
    const debug = createDebugInfo()
    setDebugInfo(debug)
  }, [])

  const handleResendEmail = async () => {
    if (!email || isResending || resendCooldown > 0) return

    setIsResending(true)
    setMessage({ type: null, text: '' })

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        console.error('Resend email error:', error)
        setMessage({
          type: 'error',
          text: error.message || 'Failed to resend verification email'
        })
      } else {
        setMessage({
          type: 'success',
          text: 'Verification email sent! Check your inbox and spam folder.'
        })

        // Start 60-second cooldown
        setResendCooldown(60)
        const timer = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch (err) {
      console.error('Resend error:', err)
      setMessage({
        type: 'error',
        text: 'Failed to resend verification email. Please try again.'
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Visible Debug Panel */}
      {showDebug && debugInfo && (
        <div className="fixed top-4 left-4 right-4 z-50 p-4 bg-blue-50 border-4 border-blue-500 rounded-lg shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-blue-700">🔍 CHECK-EMAIL DEBUG INFO</h3>
            <button
              onClick={() => setShowDebug(false)}
              className="text-blue-500 hover:text-blue-700 font-bold text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div><strong>Page loaded at:</strong> {debugInfo.pageLoadTime}</div>
            <div><strong>Total cookies found:</strong> {debugInfo.cookiesFound}</div>
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
                <strong>Supabase cookies found:</strong>
                <ul className="ml-4 mt-1">
                  {debugInfo.allSbCookies.map((cookie, index) => (
                    <li key={index} className="font-mono text-xs">{cookie}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-red-600 font-bold">⚠️ NO SUPABASE COOKIES FOUND!</div>
            )}

            <div className="mt-4 pt-2 border-t border-gray-300">
              <strong>Browser info:</strong>
              <div className="ml-4 font-mono text-xs">
                <div>Domain: {debugInfo.browserInfo.domain}</div>
                <div>Path: {debugInfo.browserInfo.path}</div>
                <div>Secure: {debugInfo.browserInfo.isSecure ? 'Yes' : 'No'}</div>
              </div>
            </div>

            {!debugInfo.flowStateCookieExists && (
              <div className="mt-4 p-2 bg-red-100 border border-red-300 rounded text-red-700">
                <strong>⚠️ WARNING:</strong> No flow state cookie found! This will cause "invalid flow state" error when clicking the verification email link.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {email && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 text-center">
                  <strong>{email}</strong>
                </p>
              </div>
            )}

            {message.type && (
              <div className={`p-3 rounded-md flex items-center space-x-2 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Next steps:</h3>
              <ol className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
                  <span>Check your email inbox (and spam folder)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
                  <span>Click the "Verify Email" button in the email</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
                  <span>Complete your venue setup in the onboarding wizard</span>
                </li>
              </ol>
            </div>

            <div className="pt-4 border-t">
              <div className="text-xs text-gray-500 text-center mb-4 space-y-1">
                <p>Didn't receive the email? Here are some things to check:</p>
                <ul className="text-left space-y-1 mt-2">
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure you entered the correct email address</li>
                  <li>• Wait a few minutes - emails can take time to arrive</li>
                  <li>• Some email providers may block automated emails</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleResendEmail}
                  disabled={isResending || resendCooldown > 0 || !email}
                  className="w-full"
                  variant="outline"
                >
                  {isResending
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend Verification Email'
                  }
                </Button>

                <Link href="/signup">
                  <Button variant="ghost" className="w-full text-xs">
                    Sign up with different email
                  </Button>
                </Link>

                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  )
}