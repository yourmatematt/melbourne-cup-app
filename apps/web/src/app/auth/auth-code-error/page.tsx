'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Email Verification Failed</CardTitle>
            <CardDescription>
              There was a problem verifying your email address. This could happen if:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• The verification link has expired</li>
              <li>• The link has already been used</li>
              <li>• The link was copied incorrectly</li>
            </ul>

            <div className="space-y-3 pt-4">
              <Link href="/signup">
                <Button className="w-full">
                  Try Signing Up Again
                </Button>
              </Link>

              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>

            <div className="pt-4 text-center">
              <p className="text-xs text-gray-500">
                Need help? Contact support for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}