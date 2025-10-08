'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginFormData } from '@/lib/auth-schemas'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: ''
    }
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔗 Attempting magic link login with:', {
        email: data.email,
        redirectTo: `${window.location.origin}/auth/callback`
      })

      // Send magic link using signInWithOtp
      const redirectUrl = `${window.location.origin}/auth/callback`

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: redirectUrl
        }
      })

      console.log('🔗 Magic link response:', {
        success: !otpError,
        error: otpError?.message
      })

      if (otpError) {
        console.error('Magic link error:', otpError)
        throw otpError
      }

      console.log('✅ Magic link sent successfully to:', data.email)

      // Redirect to check email page
      router.push(`/auth/check-email?email=${encodeURIComponent(data.email)}`)
    } catch (err) {
      console.error('Login error:', err)
      if (err instanceof Error) {
        if (err.message.includes('Email not confirmed')) {
          setError('Please check your email and click the verification link first')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to send magic link')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

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
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Sending Magic Link...' : 'Send Login Link'}
        </Button>
      </form>
    </Form>
  )
}