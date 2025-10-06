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
  const [user, setUser] = useState<any>(null)
  const [userVenueName, setUserVenueName] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        // Get venue name from user metadata (set during signup)
        setUserVenueName(user.user_metadata?.name || '')
      }
    }
    getUser()
  }, [router, supabase.auth])

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

      // Create or update tenant
      const { data: existingTenant } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      let tenantId: string

      if (existingTenant) {
        // Update existing tenant
        const { data: updatedTenant, error } = await supabase
          .from('tenants')
          .update({
            name: venueData.name,
            slug: venueData.slug
          })
          .eq('id', existingTenant.tenant_id)
          .select()
          .single()

        if (error) throw error
        tenantId = updatedTenant.id
      } else {
        // Create new tenant
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
        tenantId = newTenant.id

        // Create tenant_user relationship
        const { error: relationError } = await supabase
          .from('tenant_users')
          .insert({
            tenant_id: tenantId,
            user_id: user.id,
            role: 'owner'
          })

        if (relationError) throw relationError
      }

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

  if (!user) {
    return null
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