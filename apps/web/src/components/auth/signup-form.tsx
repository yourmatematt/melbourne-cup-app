'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
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

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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
      console.log('🔐 Attempting password signup with:', {
        email: data.email,
        venueName: data.venueName
      })

      // Sign up the user with email and password (no email confirmation)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.venueName
          }
        }
      })

      console.log('🔐 Password signup response:', {
        user: authData.user ? 'created' : 'none',
        session: authData.session ? 'active' : 'none',
        error: authError?.message
      })

      if (authError) {
        console.error('Signup auth error:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // User is immediately signed in (no email confirmation required)
      console.log('✅ User created and signed in:', {
        id: authData.user.id,
        email: authData.user.email,
        hasSession: !!authData.session
      })

      // Redirect directly to onboarding since user is already authenticated
      router.push('/onboard')
    } catch (err) {
      console.error('Signup error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account')
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
  )
}