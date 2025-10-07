'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

function AuthCodeErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  // Map error codes to user-friendly messages
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'no_code':
        return {
          title: 'Invalid Verification Link',
          message: 'The verification link is missing required information. This usually happens when the link is incomplete or corrupted.'
        }
      case 'no_session':
        return {
          title: 'Session Creation Failed',
          message: 'Unable to create your login session after email verification. The verification token may have expired.'
        }
      case 'unexpected_error':
        return {
          title: 'Unexpected Error',
          message: 'An unexpected error occurred during verification. Please try the verification process again.'
        }
      case 'configuration_error':
        return {
          title: 'Configuration Error',
          message: 'The application is not properly configured for email verification. Please contact support.'
        }
      default:
        if (errorCode) {
          return {
            title: 'Verification Failed',
            message: `Error: ${decodeURIComponent(errorCode)}`
          }
        }
        return {
          title: 'Email Verification Failed',
          message: 'There was a problem verifying your email address.'
        }
    }
  }

  const { title, message } = getErrorMessage(error)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">{title}</CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700 font-medium mb-2">This could happen if:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• The verification link has expired (links expire after 24 hours)</li>
                <li>• The link has already been used</li>
                <li>• The link was copied incorrectly or is incomplete</li>
                <li>• You're using an outdated link from a previous signup attempt</li>
              </ul>
            </div>

            {error && (
              <details className="p-3 bg-red-50 rounded-md border border-red-200">
                <summary className="text-sm font-medium text-red-800 cursor-pointer">
                  Technical Details (for debugging)
                </summary>
                <pre className="text-xs text-red-600 mt-2 break-all">
                  Error Code: {error}
                </pre>
              </details>
            )}

            <div className="space-y-3 pt-4">
              <Link href="/signup">
                <Button className="w-full">
                  Start Over - Sign Up Again
                </Button>
              </Link>

              <Link href="/login">
                <Button variant="outline" className="w-full">
                  I Already Have An Account - Login
                </Button>
              </Link>
            </div>

            <div className="pt-4 text-center">
              <p className="text-xs text-gray-500">
                Still having issues? Check your email for the most recent verification link, or contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  )
}