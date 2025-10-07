'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const supabase = createClient()

  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' })

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