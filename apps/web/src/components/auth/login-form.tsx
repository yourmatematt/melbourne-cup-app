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
      email: '',
      password: ''
    }
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔐 Attempting password login with:', {
        email: data.email
      })

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      console.log('🔐 Password login response:', {
        user: authData.user ? 'found' : 'none',
        session: authData.session ? 'active' : 'none',
        error: authError?.message
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Login failed')
      }

      console.log('✅ User signed in successfully:', {
        id: authData.user.id,
        email: authData.user.email
      })

      // Check if user has completed onboarding
      const { data: tenantUsers } = await supabase
        .from('tenant_users')
        .select(`
          tenants!tenant_id(*)
        `)
        .eq('user_id', authData.user.id)
        .limit(1)

      if (!tenantUsers || tenantUsers.length === 0) {
        // User needs to complete onboarding
        router.push('/dashboard')
      } else {
        // User has a tenant, redirect to dashboard
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err)
      if (err instanceof Error) {
        if (err.message === 'Invalid login credentials') {
          setError('Invalid email or password')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to sign in')
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <a
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot your password?
          </a>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>
    </Form>
  )
}