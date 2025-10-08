'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userVenueName, setUserVenueName] = useState<string>('')
  const [authAttempts, setAuthAttempts] = useState(0) // Track auth attempts to prevent infinite loops
  const [isInitialized, setIsInitialized] = useState(false) // Prevent multiple initializations
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkUserAndTenant(currentUser: any) {
      try {
        if (!currentUser) {
          console.log('🔐 Onboarding: No user found, redirecting to login')
          setIsAuthLoading(false)
          router.push('/login')
          return
        }

        console.log('🔐 Onboarding: User is authenticated, checking tenant status')
        setUser(currentUser)
        setUserVenueName(currentUser.user_metadata?.name || '')

        // Check if user already has a tenant - SINGLE ATTEMPT ONLY
        try {
          console.log('🔐 Onboarding: Checking for existing tenant...')
          const { data: existingTenant, error: tenantError } = await supabase
            .from('tenant_users')
            .select('tenant_id, tenants!tenant_id(id, name)')
            .eq('user_id', currentUser.id)
            .maybeSingle() // Use maybeSingle() instead of single() to avoid errors when no rows found

          if (tenantError) {
            console.warn('🔐 Onboarding: Tenant check error (treating as new user):', tenantError.message)
            // Treat any error as "new user" - don't retry
            setIsAuthLoading(false)
            return
          }

          if (existingTenant?.tenant_id) {
            console.log('🔐 Onboarding: User already has tenant, redirecting to dashboard')
            router.push('/dashboard')
            return
          }

          console.log('🔐 Onboarding: New user, proceeding with onboarding')
          setIsAuthLoading(false)

        } catch (tenantErr) {
          console.warn('🔐 Onboarding: Tenant check failed (treating as new user):', tenantErr)
          // Treat any tenant check error as "new user" - don't retry
          setIsAuthLoading(false)
        }
      } catch (err) {
        console.error('🔐 Onboarding: Unexpected error in checkUserAndTenant:', err)
        setIsAuthLoading(false)
      }
    }

    async function initializeAuth() {
      // Prevent multiple initializations
      if (isInitialized || authAttempts >= 3) {
        console.log('🔐 Onboarding: Skipping initialization - already initialized or max attempts reached')
        return
      }

      try {
        setIsAuthLoading(true)
        setAuthAttempts(prev => prev + 1)

        console.log(`🔐 Onboarding: Auth initialization attempt ${authAttempts + 1}/3`)

        // Single auth check - no retries for password auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        console.log('🔐 Onboarding: Session check result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          attempt: authAttempts + 1,
          error: sessionError?.message
        })

        if (session?.user) {
          console.log('🔐 Onboarding: Session found, checking tenant status')
          setIsInitialized(true)
          await checkUserAndTenant(session.user)
          return
        }

        // Fallback: check getUser() once
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (user) {
          console.log('🔐 Onboarding: User found via getUser(), checking tenant status')
          setIsInitialized(true)
          await checkUserAndTenant(user)
          return
        }

        // No user found - redirect to login (no retries for password auth)
        console.log('🔐 Onboarding: No authenticated user found, redirecting to login')
        setIsInitialized(true)
        setIsAuthLoading(false)
        router.push('/login')

      } catch (err) {
        console.error('🔐 Onboarding: Auth initialization error:', err)
        setIsInitialized(true)
        setIsAuthLoading(false)

        // Only redirect to login if we've tried multiple times
        if (authAttempts >= 2) {
          router.push('/login')
        }
      }
    }

    // Set up auth state change listener (simplified to prevent loops)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Onboarding: Auth state change:', event, !!session?.user)

        // Only handle SIGNED_OUT events to avoid infinite loops
        if (event === 'SIGNED_OUT') {
          console.log('🔐 Onboarding: User signed out, resetting state')
          setUser(null)
          setIsAuthLoading(false)
          setIsInitialized(false)
          setAuthAttempts(0)
          router.push('/login')
        }
        // Don't handle SIGNED_IN or TOKEN_REFRESHED to prevent loops
        // Initial auth check handles the authentication
      }
    )

    // Initialize auth check only once
    if (!isInitialized && authAttempts === 0) {
      initializeAuth()
    }

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase.auth]) // Removed user dependency to prevent loops

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

  // Show loading state while checking authentication (with debounce to prevent flickering)
  const [showLoading, setShowLoading] = useState(false)

  // Debounce loading state to prevent flickering
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isAuthLoading) {
      // Show loading after 200ms to prevent flicker
      timer = setTimeout(() => setShowLoading(true), 200)
    } else {
      setShowLoading(false)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isAuthLoading])

  if (showLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Setting up your account...</h2>
          <p className="text-gray-600 text-center">
            Preparing your onboarding experience...
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