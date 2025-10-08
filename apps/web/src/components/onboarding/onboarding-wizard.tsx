'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, debugAuthCookies } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { VenueDetailsForm } from './venue-details-form'
import { BrandKitForm } from './brand-kit-form'
import { EventSetupForm } from './event-setup-form'
import type { VenueDetailsData, BrandKitData, EventSetupData } from '@/lib/auth-schemas'

type OnboardingStep = 'venue' | 'branding' | 'event' | 'complete'

interface OnboardingData {
  venue?: VenueDetailsData
  branding?: BrandKitData
  event?: EventSetupData
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('venue')
  const [data, setData] = useState<OnboardingData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true) // Add auth loading state
  const [user, setUser] = useState<any>(null)
  const [userVenueName, setUserVenueName] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkUserAndTenant(currentUser: any) {
      try {
        if (!currentUser) {
          console.log('🔐 Onboarding: No user found, redirecting to login')
          router.push('/login')
          return
        }

        if (!currentUser.email_confirmed_at) {
          console.log('🔐 Onboarding: User email not confirmed, redirecting to check-email')
          router.push(`/auth/check-email?email=${encodeURIComponent(currentUser.email || '')}`)
          return
        }

        console.log('🔐 Onboarding: User is authenticated and verified')
        setUser(currentUser)
        // Get venue name from user metadata (set during signup)
        setUserVenueName(currentUser.user_metadata?.name || '')

        // Check if user already has a tenant - if so, skip onboarding
        console.log('🔐 Onboarding: Checking for existing tenant...')
        const { data: existingTenant, error: tenantError } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', currentUser.id)
          .single()

        if (tenantError && tenantError.code !== 'PGRST116') {
          // PGRST116 = no rows found, which is expected for new users
          console.error('🔐 Onboarding: Error checking tenant:', tenantError)
        }

        if (existingTenant) {
          console.log('🔐 Onboarding: User already has tenant, redirecting to dashboard')
          router.push('/dashboard')
        } else {
          console.log('🔐 Onboarding: New user, proceeding with onboarding')
          setIsAuthLoading(false)
        }
      } catch (err) {
        console.error('🔐 Onboarding: Unexpected error:', err)
        setIsAuthLoading(false)
      }
    }

    async function initializeAuth() {
      try {
        setIsAuthLoading(true)

        // Log current session state for debugging
        console.log('🔐 Onboarding: Starting auth initialization at', new Date().toISOString())

        // Debug magic link cookies
        console.log('🔗 Debugging magic link cookies before session check:')
        debugAuthCookies()

        // Check for existing session first (more reliable than getUser for newly verified users)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        console.log('🔐 Onboarding: Session check result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          emailConfirmed: session?.user?.email_confirmed_at,
          sessionExpiry: session?.expires_at,
          error: sessionError?.message
        })

        if (session?.user) {
          // Session exists, proceed with user validation
          await checkUserAndTenant(session.user)
          return
        }

        // No session found, try getUser as fallback
        console.log('🔐 Onboarding: No session found, trying getUser...')
        const { data: { user }, error } = await supabase.auth.getUser()

        console.log('🔐 Onboarding: GetUser result:', {
          hasUser: !!user,
          userEmail: user?.email,
          emailConfirmed: user?.email_confirmed_at,
          error: error?.message
        })

        if (user) {
          await checkUserAndTenant(user)
        } else {
          // No user found immediately after email verification - this is the critical timing issue
          console.log('🔐 Onboarding: No user found initially, implementing delayed retry with multiple attempts...')

          // Try multiple times with increasing delays to handle various email verification timing scenarios
          const retryAttempts = [500, 1000, 2000] // 0.5s, 1s, 2s delays
          let userFound = false

          for (let i = 0; i < retryAttempts.length && !userFound; i++) {
            console.log(`🔐 Onboarding: Retry attempt ${i + 1}/${retryAttempts.length} after ${retryAttempts[i]}ms...`)
            await new Promise(resolve => setTimeout(resolve, retryAttempts[i]))

            // Check both session and user on retry
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            const { data: { user: retryUser } } = await supabase.auth.getUser()

            console.log(`🔐 Onboarding: Retry ${i + 1} result:`, {
              hasSession: !!retrySession,
              hasUser: !!retryUser,
              userEmail: retryUser?.email || retrySession?.user?.email,
              source: retrySession?.user ? 'session' : retryUser ? 'getUser' : 'none'
            })

            const foundUser = retrySession?.user || retryUser
            if (foundUser) {
              console.log(`🔐 Onboarding: User found on retry ${i + 1}`)
              await checkUserAndTenant(foundUser)
              userFound = true
            }
          }

          if (!userFound) {
            console.log('🔐 Onboarding: No user found after all retry attempts, redirecting to login')
            setIsAuthLoading(false)
            router.push('/login')
          }
        }
      } catch (err) {
        console.error('🔐 Onboarding: Auth initialization error:', err)
        setIsAuthLoading(false)
      }
    }

    // Set up auth state change listener for real-time updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Onboarding: Auth state change:', event, !!session?.user)

        if (event === 'SIGNED_IN' && session?.user) {
          // User just signed in - this handles the email verification callback case
          console.log('🔐 Onboarding: SIGNED_IN event received, processing user...')
          await checkUserAndTenant(session.user)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token refreshed - update user if needed
          console.log('🔐 Onboarding: TOKEN_REFRESHED event received')
          if (!user) {
            await checkUserAndTenant(session.user)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsAuthLoading(false)
          router.push('/login')
        }
      }
    )

    // Initialize auth check
    initializeAuth()

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase.auth, user])

  const steps = [
    { key: 'venue', title: 'Venue Details', description: 'Tell us about your venue' },
    { key: 'branding', title: 'Brand Kit', description: 'Customize your appearance' },
    { key: 'event', title: 'First Event', description: 'Set up your first sweep (optional)' },
    { key: 'complete', title: 'Complete', description: 'All done!' }
  ]

  const currentStepIndex = steps.findIndex(step => step.key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  async function handleVenueSubmit(venueData: VenueDetailsData) {
    setIsLoading(true)
    try {
      if (!user) throw new Error('No user found')

      // Update user's name in the users table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ name: venueData.contactName })
        .eq('id', user.id)

      if (userUpdateError) throw userUpdateError

      // Create new tenant (each venue gets its own tenant for proper isolation)
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: venueData.name,
          slug: venueData.slug,
          billing_status: 'trial'
        })
        .select()
        .single()

      if (tenantError) throw tenantError
      const tenantId = newTenant.id

      // Create tenant_user relationship
      const { error: relationError } = await supabase
        .from('tenant_users')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          role: 'owner'
        })

      if (relationError) throw relationError

      setData(prev => ({ ...prev, venue: venueData }))
      setCurrentStep('branding')
    } catch (error) {
      console.error('Error saving venue details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBrandingSubmit(brandingData: BrandKitData) {
    setIsLoading(true)
    try {
      if (!user) throw new Error('No user found')

      // Get tenant ID
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (!tenantUser) throw new Error('No tenant found')

      // Update brand kit
      const { error } = await supabase
        .from('brand_kits')
        .update({
          color_primary: brandingData.colorPrimary,
          color_secondary: brandingData.colorSecondary
        })
        .eq('tenant_id', tenantUser.tenant_id)

      if (error) throw error

      setData(prev => ({ ...prev, branding: brandingData }))
      setCurrentStep('event')
    } catch (error) {
      console.error('Error saving brand kit:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEventSubmit(eventData: EventSetupData) {
    setIsLoading(true)
    try {
      if (!user) throw new Error('No user found')

      // Get tenant ID
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (!tenantUser) throw new Error('No tenant found')

      // Create event
      const { error } = await supabase
        .from('events')
        .insert({
          tenant_id: tenantUser.tenant_id,
          name: eventData.name,
          starts_at: eventData.startsAt,
          mode: eventData.mode,
          capacity: eventData.capacity,
          status: 'draft'
        })

      if (error) throw error

      setData(prev => ({ ...prev, event: eventData }))
      setCurrentStep('complete')
    } catch (error) {
      console.error('Error creating event:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function skipEvent() {
    setCurrentStep('complete')
  }

  function completeLater() {
    router.push('/dashboard')
  }

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Setting up your account...</h2>
          <p className="text-gray-600 text-center">
            Please wait while we verify your email confirmation and prepare your onboarding experience.
          </p>
        </div>
      </div>
    )
  }

  // Show error state if user is not found after loading
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600 text-center mb-4">
            We couldn't verify your authentication. Please try logging in again.
          </p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Welcome to Melbourne Cup</h1>
        <p className="text-gray-600 text-center mb-6">
          Let's get your venue set up for running sweeps
        </p>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <Badge variant="outline">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`flex flex-col items-center ${
                index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                  index < currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : index === currentStepIndex
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {index < currentStepIndex ? '✓' : index + 1}
              </div>
              <span className="text-xs text-center">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStepIndex]?.title}</CardTitle>
          <CardDescription>{steps[currentStepIndex]?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 'venue' && (
            <VenueDetailsForm
              onSubmit={handleVenueSubmit}
              isLoading={isLoading}
              defaultValues={data.venue}
              userVenueName={userVenueName}
            />
          )}

          {currentStep === 'branding' && (
            <BrandKitForm
              onSubmit={handleBrandingSubmit}
              onBack={() => setCurrentStep('venue')}
              isLoading={isLoading}
              defaultValues={data.branding}
            />
          )}

          {currentStep === 'event' && (
            <EventSetupForm
              onSubmit={handleEventSubmit}
              onSkip={skipEvent}
              onBack={() => setCurrentStep('branding')}
              isLoading={isLoading}
              defaultValues={data.event}
            />
          )}

          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Setup Complete!</h3>
              <p className="text-gray-600 mb-6">
                Your venue is ready to start running Melbourne Cup sweeps.
              </p>
              <Button onClick={completeLater} size="lg">
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}