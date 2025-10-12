'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { newEventSchema, type NewEventFormData, type HorseFormData } from '@/lib/event-schemas'
import { MELBOURNE_CUP_2025_DATE, MELBOURNE_CUP_2025_HORSES } from '@/lib/melbourne-cup-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ChevronLeft, ChevronRight, Calendar, DollarSign, Clock, Users, CheckCircle2, X } from 'lucide-react'

// Step 1: Event Details Component
function EventDetailsStep({ formData, setFormData, errors }: {
  formData: NewEventFormData
  setFormData: (data: Partial<NewEventFormData>) => void
  errors: any
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-[24px] leading-[32px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
          Event Details
        </h2>
        <p className="text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-600">
          Let's start with the basic information for your Melbourne Cup event
        </p>
      </div>

      <div className="space-y-6">
        {/* Event Name */}
        <div>
          <Label className="text-[14px] leading-[20px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-3 block">
            Event Name
          </Label>
          <Input
            placeholder="e.g. Melbourne Cup 2025 - Office Sweep"
            value={formData.name}
            onChange={(e) => setFormData({ name: e.target.value })}
            className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[48px] px-4 text-[16px] font-['Arial:Regular',_sans-serif] focus:border-[#ff8a00] focus:ring-1 focus:ring-[#ff8a00]"
          />
          {errors.name && (
            <p className="text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-red-600 mt-2">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Event Date & Time */}
        <div>
          <Label className="text-[14px] leading-[20px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-3 block">
            Event Date & Time
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="date"
                value={formData.startsAt ? formData.startsAt.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = new Date(e.target.value)
                  if (formData.startsAt) {
                    date.setHours(formData.startsAt.getHours(), formData.startsAt.getMinutes())
                  } else {
                    date.setHours(15, 0) // Default 3 PM
                  }
                  setFormData({ startsAt: date })
                }}
                className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[48px] pl-12 pr-4 text-[16px] font-['Arial:Regular',_sans-serif] focus:border-[#ff8a00] focus:ring-1 focus:ring-[#ff8a00]"
              />
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="time"
                value={formData.startsAt ? formData.startsAt.toTimeString().slice(0, 5) : ''}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number)
                  const date = formData.startsAt ? new Date(formData.startsAt) : new Date()
                  date.setHours(hours, minutes)
                  setFormData({ startsAt: date })
                }}
                className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[48px] pl-12 pr-4 text-[16px] font-['Arial:Regular',_sans-serif] focus:border-[#ff8a00] focus:ring-1 focus:ring-[#ff8a00]"
              />
            </div>
          </div>
          {errors.startsAt && (
            <p className="text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-red-600 mt-2">
              {errors.startsAt.message}
            </p>
          )}
        </div>

        {/* Entry Fee */}
        <div>
          <Label className="text-[14px] leading-[20px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-3 block">
            Entry Fee
          </Label>
          <div className="relative w-[200px]">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.entryFee || 0}
              onChange={(e) => setFormData({ entryFee: parseFloat(e.target.value) || 0 })}
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[48px] pl-12 pr-4 text-[16px] font-['Arial:Regular',_sans-serif] focus:border-[#ff8a00] focus:ring-1 focus:ring-[#ff8a00]"
            />
          </div>
          <p className="text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-slate-600 mt-2">
            Amount each participant pays to enter (set to $0 for free events)
          </p>
        </div>
      </div>
    </div>
  )
}

// Step 2: Event Type Component
function EventTypeStep({ formData, setFormData }: {
  formData: NewEventFormData
  setFormData: (data: Partial<NewEventFormData>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-[24px] leading-[32px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
          Event Type
        </h2>
        <p className="text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-600">
          Choose how participants will be assigned horses
        </p>
      </div>

      <div className="space-y-4">
        {/* Sweep Option */}
        <div
          className={`relative border-2 rounded-[16px] p-6 cursor-pointer transition-all ${
            formData.mode === 'sweep'
              ? 'border-[#ff8a00] bg-gradient-to-r from-orange-50 to-pink-50'
              : 'border-[rgba(0,0,0,0.08)] bg-white hover:border-[rgba(0,0,0,0.16)] hover:shadow-sm'
          }`}
          onClick={() => setFormData({ mode: 'sweep' })}
        >
          <div className="flex items-start gap-4">
            {/* Radio Button */}
            <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center ${
              formData.mode === 'sweep'
                ? 'border-[#ff8a00] bg-[#ff8a00]'
                : 'border-slate-300'
            }`}>
              {formData.mode === 'sweep' && (
                <div className="w-3 h-3 bg-white rounded-full"></div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
                Melbourne Cup Sweep
              </h3>
              <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-4">
                Traditional random draw where participants are randomly assigned horses. Simple, fair, and perfect for any group size.
              </p>

              {/* Feature Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Easy Setup
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Random Draw
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Equal Chances
                </span>
              </div>
            </div>
          </div>

          {/* Selected Indicator */}
          {formData.mode === 'sweep' && (
            <div className="absolute top-4 right-4">
              <CheckCircle2 className="w-6 h-6 text-[#ff8a00]" />
            </div>
          )}
        </div>

        {/* Calcutta Option */}
        <div
          className={`relative border-2 rounded-[16px] p-6 cursor-pointer transition-all ${
            formData.mode === 'calcutta'
              ? 'border-[#ff8a00] bg-gradient-to-r from-orange-50 to-pink-50'
              : 'border-[rgba(0,0,0,0.08)] bg-white hover:border-[rgba(0,0,0,0.16)] hover:shadow-sm'
          }`}
          onClick={() => setFormData({ mode: 'calcutta' })}
        >
          <div className="flex items-start gap-4">
            {/* Radio Button */}
            <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center ${
              formData.mode === 'calcutta'
                ? 'border-[#ff8a00] bg-[#ff8a00]'
                : 'border-slate-300'
            }`}>
              {formData.mode === 'calcutta' && (
                <div className="w-3 h-3 bg-white rounded-full"></div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
                Melbourne Cup Calcutta
              </h3>
              <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-4">
                Auction-style event where participants bid on horses. More strategic and interactive with higher potential prizes.
              </p>

              {/* Feature Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Auction Bidding
                </span>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Strategic
                </span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Higher Stakes
                </span>
              </div>
            </div>
          </div>

          {/* Selected Indicator */}
          {formData.mode === 'calcutta' && (
            <div className="absolute top-4 right-4">
              <CheckCircle2 className="w-6 h-6 text-[#ff8a00]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Step 3: Participant Capacity Component
function ParticipantCapacityStep({ formData, setFormData }: {
  formData: NewEventFormData
  setFormData: (data: Partial<NewEventFormData>) => void
}) {
  const quickSelectOptions = [12, 16, 24, 32]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-[24px] leading-[32px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
          Participant Capacity
        </h2>
        <p className="text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-600">
          How many people can join your event?
        </p>
      </div>

      <div className="space-y-8">
        {/* Quick Select Buttons */}
        <div>
          <Label className="text-[14px] leading-[20px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4 block">
            Quick Select
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {quickSelectOptions.map((capacity) => (
              <button
                key={capacity}
                type="button"
                onClick={() => setFormData({ capacity })}
                className={`h-[64px] rounded-[12px] border-2 transition-all font-['Arial:Regular',_sans-serif] ${
                  formData.capacity === capacity
                    ? 'border-[#ff8a00] bg-gradient-to-r from-orange-50 to-pink-50 text-[#ff8a00]'
                    : 'border-[rgba(0,0,0,0.08)] bg-white hover:border-[rgba(0,0,0,0.16)] text-slate-700'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[20px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold">
                    {capacity}
                  </span>
                  <span className="text-[12px] leading-[16px]">
                    {capacity === 24 ? 'Recommended' : 'Participants'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Capacity Input */}
        <div>
          <Label className="text-[14px] leading-[20px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4 block">
            Custom Capacity
          </Label>
          <div className="relative w-[200px]">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="number"
              min="2"
              max="200"
              placeholder="Enter number"
              value={formData.capacity || ''}
              onChange={(e) => setFormData({ capacity: parseInt(e.target.value) || 0 })}
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[48px] pl-12 pr-4 text-[16px] font-['Arial:Regular',_sans-serif] focus:border-[#ff8a00] focus:ring-1 focus:ring-[#ff8a00]"
            />
          </div>
          <p className="text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-slate-600 mt-2">
            Minimum 2, maximum 200 participants
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-[#f8f7f4] rounded-[16px] p-6 border border-[rgba(0,0,0,0.08)]">
          <h4 className="text-[16px] leading-[24px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-3">
            💡 Capacity Guidelines
          </h4>
          <div className="space-y-2 text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
            <p>• <strong>24 participants:</strong> Perfect for Melbourne Cup (24 horses)</p>
            <p>• <strong>More than 24:</strong> Multiple people can share the same horse</p>
            <p>• <strong>Less than 24:</strong> Some horses won't be selected</p>
            <p>• You can adjust this number later if needed</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 4: Settings Component
function SettingsStep({ formData, setFormData }: {
  formData: NewEventFormData
  setFormData: (data: Partial<NewEventFormData>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-[24px] leading-[32px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
          Settings
        </h2>
        <p className="text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-600">
          Configure additional options for your event
        </p>
      </div>

      <div className="space-y-6">
        {/* Lead Capture Toggle */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[16px] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-[16px] leading-[24px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
                Lead Capture
              </h3>
              <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
                Collect participant contact details for marketing and future events
              </p>
            </div>
            <Switch
              checked={formData.leadCapture}
              onCheckedChange={(checked) => setFormData({ leadCapture: checked })}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#ff8a00] data-[state=checked]:to-[#ff4d8d]"
            />
          </div>
        </div>

        {/* Promotional Incentives Toggle */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[16px] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-[16px] leading-[24px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
                Promotional Incentives
              </h3>
              <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
                Encourage quick payments with time-limited promotional offers
              </p>
            </div>
            <Switch
              checked={formData.promoEnabled}
              onCheckedChange={(checked) => setFormData({ promoEnabled: checked })}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#ff8a00] data-[state=checked]:to-[#ff4d8d]"
            />
          </div>

          {/* Conditional Promo Fields */}
          {formData.promoEnabled && (
            <div className="mt-6 pt-6 border-t border-[rgba(0,0,0,0.08)] space-y-4">
              <div>
                <Label className="text-[14px] leading-[20px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-3 block">
                  Promotional Message
                </Label>
                <Textarea
                  placeholder="e.g., Pay within 10 minutes and receive a free pot of Carlton Draught!"
                  value={formData.promoMessage || ''}
                  onChange={(e) => setFormData({ promoMessage: e.target.value })}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] p-4 text-[14px] font-['Arial:Regular',_sans-serif] focus:border-[#ff8a00] focus:ring-1 focus:ring-[#ff8a00] min-h-[100px] resize-none"
                />
              </div>

              <div>
                <Label className="text-[14px] leading-[20px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-3 block">
                  Terms & Conditions
                </Label>
                <Textarea
                  placeholder="Enter any custom terms and conditions..."
                  value={formData.customTerms || ''}
                  onChange={(e) => setFormData({ customTerms: e.target.value })}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] p-4 text-[14px] font-['Arial:Regular',_sans-serif] focus:border-[#ff8a00] focus:ring-1 focus:ring-[#ff8a00] min-h-[80px] resize-none"
                />
              </div>

              <div>
                <Label className="text-[14px] leading-[20px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-3 block">
                  Custom Rules
                </Label>
                <Textarea
                  placeholder="Enter any custom rules for the event..."
                  value={formData.customRules || ''}
                  onChange={(e) => setFormData({ customRules: e.target.value })}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] p-4 text-[14px] font-['Arial:Regular',_sans-serif] focus:border-[#ff8a00] focus:ring-1 focus:ring-[#ff8a00] min-h-[80px] resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Event Creation Wizard Component
export function EventCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [horses] = useState<HorseFormData[]>(
    MELBOURNE_CUP_2025_HORSES.map(horse => ({
      ...horse,
      jockey: horse.jockey || '',
      isScratched: false
    }))
  )
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<NewEventFormData>({
    resolver: zodResolver(newEventSchema),
    defaultValues: {
      name: '',
      startsAt: new Date(MELBOURNE_CUP_2025_DATE),
      timezone: 'Australia/Melbourne',
      capacity: 24,
      mode: 'sweep',
      leadCapture: false,
      customTerms: '',
      customRules: '',
      promoEnabled: false,
      promoMessage: '',
      promoDuration: 10,
      entryFee: 0
    }
  })

  const formData = form.watch()
  const errors = form.formState.errors

  // Get user and tenant info
  useEffect(() => {
    async function getUserAndTenant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get tenant ID
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantUser) {
        setTenantId(tenantUser.tenant_id)
      }
    }

    getUserAndTenant()
  }, [router, supabase])

  const updateFormData = (data: Partial<NewEventFormData>) => {
    Object.entries(data).forEach(([key, value]) => {
      form.setValue(key as keyof NewEventFormData, value)
    })
  }

  const validateCurrentStep = async () => {
    switch (currentStep) {
      case 1:
        return await form.trigger(['name', 'startsAt'])
      case 2:
        return await form.trigger(['mode'])
      case 3:
        return await form.trigger(['capacity'])
      case 4:
        return true // Settings are optional
      default:
        return false
    }
  }

  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user || !tenantId) {
      return
    }

    const isValid = await form.trigger()
    if (!isValid) {
      return
    }

    setIsLoading(true)

    try {
      const data = form.getValues()

      // Log the form data for debugging
      console.log('🔍 Form data before submission:', data)
      console.log('🔍 User ID:', user.id)
      console.log('🔍 Tenant ID:', tenantId)
      console.log('🔍 Date value type:', typeof data.startsAt, data.startsAt)

      // Prepare the event data for submission - mapping to correct database schema
      const eventData = {
        tenant_id: tenantId,
        name: data.name,
        starts_at: data.startsAt.toISOString(),
        timezone: 'Australia/Melbourne',
        capacity: data.capacity,
        mode: data.mode,
        lead_capture: data.leadCapture ?? false,
        promo_enabled: data.promoEnabled ?? false,
        promo_message: data.promoEnabled ? data.promoMessage : null,
        promo_duration: data.promoEnabled ? data.promoDuration : null,
        status: 'draft',
        entry_fee: data.entryFee || 0,
        custom_terms: data.customTerms || null,
        custom_rules: data.customRules || null
      }

      // Prepare horses data for API
      const horsesData = horses.map(horse => ({
        number: horse.number,
        name: horse.name,
        jockey: horse.jockey || null,
        is_scratched: horse.isScratched
      }))

      // Prepare full request payload for API
      const requestPayload = {
        event: eventData,
        horses: horsesData
      }

      console.log('🔍 Data being sent to API:', requestPayload)

      // Create event via API route
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create event')
      }

      const { event } = await response.json()

      console.log('✅ Event created successfully:', event)

      // Redirect to the created event details page
      router.push(`/dashboard/events/${event.id}`)
    } catch (err) {
      console.error('❌ Error creating event:', err)
      console.error('❌ Error message:', err instanceof Error ? err.message : 'Unknown error')
      console.error('❌ Form data sent:', form.getValues())

      // Show user-friendly error message
      alert('Failed to create event. Please check the console for details and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-8">
        {[1, 2, 3, 4].map((step) => {
          const stepLabels = ['Details', 'Type', 'Capacity', 'Settings']
          const isActive = step === currentStep
          const isCompleted = step < currentStep

          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-['Arial:Bold',_sans-serif] font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white'
                    : isCompleted
                    ? 'bg-[#ff8a00] text-white'
                    : 'bg-[#f8f7f4] text-slate-600'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
                <span className={`mt-2 text-[12px] font-['Arial:Regular',_sans-serif] ${
                  isActive ? 'text-slate-900 font-bold' : 'text-slate-600'
                }`}>
                  {stepLabels[step - 1]}
                </span>
              </div>
              {step < 4 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  step < currentStep ? 'bg-[#ff8a00]' : 'bg-[#f8f7f4]'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  if (!user || !tenantId) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-[24px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#f8f7f4] px-8 py-6 border-b border-[rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] leading-[36px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900">
                Create New Event
              </h1>
              <p className="text-[16px] leading-[24px] font-['Arial:Regular',_sans-serif] text-slate-600">
                Step {currentStep} of 4
              </p>
            </div>
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="w-10 h-10 p-0 rounded-lg hover:bg-white/50"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-8 py-8">
          <StepIndicator />
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <EventDetailsStep
                formData={formData}
                setFormData={updateFormData}
                errors={errors}
              />
            )}
            {currentStep === 2 && (
              <EventTypeStep
                formData={formData}
                setFormData={updateFormData}
              />
            )}
            {currentStep === 3 && (
              <ParticipantCapacityStep
                formData={formData}
                setFormData={updateFormData}
              />
            )}
            {currentStep === 4 && (
              <SettingsStep
                formData={formData}
                setFormData={updateFormData}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8f7f4] px-8 py-6 border-t border-[rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[48px] px-6 font-['Arial:Regular',_sans-serif] hover:bg-gray-50"
            >
              Cancel
            </Button>

            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[48px] px-6 font-['Arial:Regular',_sans-serif] hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[48px] px-6 font-['Arial:Regular',_sans-serif] hover:opacity-90"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[48px] px-6 font-['Arial:Regular',_sans-serif] hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? 'Creating Event...' : 'Create Event'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}