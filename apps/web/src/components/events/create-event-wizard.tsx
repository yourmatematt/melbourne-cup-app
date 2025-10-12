'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { MELBOURNE_CUP_2025_DATE } from '@/lib/melbourne-cup-data'

interface CreateEventWizardProps {
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  eventName: string
  eventDate: string
  eventTime: string
  entryFee: string
  eventType: 'sweep' | 'calcutta' | null
  capacity: number
  promoEnabled: boolean
  promoMessage: string
  promoDuration: number
  leadCapture: boolean
}

export function CreateEventWizard({ isOpen, onClose }: CreateEventWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    eventName: '',
    eventDate: '',
    eventTime: '',
    entryFee: '0.00',
    eventType: null,
    capacity: 24,
    promoEnabled: false,
    promoMessage: '',
    promoDuration: 24,
    leadCapture: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Set default date and time
  useEffect(() => {
    const defaultDate = new Date(MELBOURNE_CUP_2025_DATE)
    setFormData(prev => ({
      ...prev,
      eventDate: defaultDate.toISOString().split('T')[0],
      eventTime: defaultDate.toTimeString().slice(0, 5)
    }))
  }, [])

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Create event in database
      const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`)

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          name: formData.eventName,
          event_date: eventDateTime.toISOString(),
          entry_fee: parseFloat(formData.entryFee),
          event_type: formData.eventType,
          max_participants: formData.capacity,
          promo_enabled: formData.promoEnabled,
          promo_message: formData.promoMessage,
          promo_duration: formData.promoDuration,
          lead_capture: formData.leadCapture,
          status: 'draft',
          created_by: user.id
        })
        .select()
        .single()

      if (eventError) {
        throw eventError
      }

      console.log('Event created successfully:', event)

      // Close modal and redirect to event page
      onClose()
      router.push(`/events/${event.id}`)
    } catch (error) {
      console.error('Error creating event:', error)
      // Could add toast notification here
      alert('Failed to create event. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.eventName.trim() && formData.eventDate && formData.eventTime && formData.entryFee
      case 2:
        return formData.eventType !== null
      case 3:
        return formData.capacity >= 2 && formData.capacity <= 100
      case 4:
        return true // Settings are optional
      default:
        return false
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between w-[552px] h-[64px] mb-6">
      {[1, 2, 3, 4].map((step) => {
        const stepLabels = ['Details', 'Type', 'Capacity', 'Settings']
        const isActive = step === currentStep
        const isCompleted = step < currentStep

        return (
          <div key={step} className="flex flex-col items-center h-[64px] relative">
            {/* Connector line */}
            {step < 4 && (
              <div className="absolute top-[19px] left-[44px] w-[136px] h-[2px] bg-[#f8f7f4]" />
            )}

            {/* Step circle */}
            <div className={`relative z-10 w-[40px] h-[40px] rounded-full flex items-center justify-center text-[14px] font-['Arial:Bold',_sans-serif] font-bold ${
              isActive
                ? 'bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white'
                : 'bg-[#f8f7f4] text-slate-600'
            }`}>
              {step}
            </div>

            {/* Step label */}
            <div className="mt-2">
              <span className={`text-[12px] font-['Arial:Regular',_sans-serif] ${
                isActive ? 'text-slate-900 font-bold' : 'text-slate-600'
              }`}>
                {stepLabels[step - 1]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-1">
          Event Details
        </h3>
        <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
          Enter the basic information for your event
        </p>
      </div>

      <div className="space-y-6">
        {/* Event Name */}
        <div>
          <Label className="text-[14px] text-slate-900 mb-2 block font-['Arial:Regular',_sans-serif]">
            Event Name
          </Label>
          <Input
            placeholder="e.g. Melbourne Cup 2025"
            value={formData.eventName}
            onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
            className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[36px] px-3 font-['Arial:Regular',_sans-serif]"
          />
        </div>

        {/* Event Date & Time */}
        <div>
          <Label className="text-[14px] text-slate-900 mb-2 block font-['Arial:Regular',_sans-serif]">
            Event Date & Time
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={formData.eventDate}
              onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[36px] px-3 font-['Arial:Regular',_sans-serif]"
            />
            <Input
              type="time"
              value={formData.eventTime}
              onChange={(e) => setFormData(prev => ({ ...prev, eventTime: e.target.value }))}
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[36px] px-3 font-['Arial:Regular',_sans-serif]"
            />
          </div>
        </div>

        {/* Entry Fee */}
        <div>
          <Label className="text-[14px] text-slate-900 mb-2 block font-['Arial:Regular',_sans-serif]">
            Entry Fee
          </Label>
          <div className="relative w-[200px]">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[16px] font-['Arial:Regular',_sans-serif] text-slate-600">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              value={formData.entryFee}
              onChange={(e) => setFormData(prev => ({ ...prev, entryFee: e.target.value }))}
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[36px] pl-7 pr-3 font-['Arial:Regular',_sans-serif]"
            />
          </div>
          <p className="text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-slate-600 mt-2">
            Cost per participant entry
          </p>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-1">
          Event Type
        </h3>
        <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
          Choose the type of Melbourne Cup event you'd like to run
        </p>
      </div>

      <div className="space-y-4">
        {/* Sweep Option */}
        <div
          className={`border-2 rounded-[16px] p-6 cursor-pointer transition-all ${
            formData.eventType === 'sweep'
              ? 'border-[#ff8a00] bg-gradient-to-r from-orange-50 to-pink-50'
              : 'border-[rgba(0,0,0,0.08)] bg-white hover:border-[rgba(0,0,0,0.16)]'
          }`}
          onClick={() => setFormData(prev => ({ ...prev, eventType: 'sweep' }))}
        >
          <div className="flex items-start gap-4">
            <div className={`w-5 h-5 rounded-full border-2 mt-1 ${
              formData.eventType === 'sweep'
                ? 'border-[#ff8a00] bg-[#ff8a00]'
                : 'border-slate-300'
            }`}>
              {formData.eventType === 'sweep' && (
                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
                Melbourne Cup Sweep
              </h4>
              <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-3">
                Traditional sweep where participants randomly draw horses. Perfect for offices and social groups.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Easy Setup
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Random Draw
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[12px] font-['Arial:Regular',_sans-serif]">
                  Fair for All
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Calcutta Option */}
        <div
          className={`border-2 rounded-[16px] p-6 cursor-pointer transition-all ${
            formData.eventType === 'calcutta'
              ? 'border-[#ff8a00] bg-gradient-to-r from-orange-50 to-pink-50'
              : 'border-[rgba(0,0,0,0.08)] bg-white hover:border-[rgba(0,0,0,0.16)]'
          }`}
          onClick={() => setFormData(prev => ({ ...prev, eventType: 'calcutta' }))}
        >
          <div className="flex items-start gap-4">
            <div className={`w-5 h-5 rounded-full border-2 mt-1 ${
              formData.eventType === 'calcutta'
                ? 'border-[#ff8a00] bg-[#ff8a00]'
                : 'border-slate-300'
            }`}>
              {formData.eventType === 'calcutta' && (
                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-[16px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
                Melbourne Cup Calcutta
              </h4>
              <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-3">
                Auction-style event where participants bid on horses. Higher engagement with strategic bidding.
              </p>
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
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-1">
          Event Capacity
        </h3>
        <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
          Set the maximum number of participants for your event
        </p>
      </div>

      <div className="space-y-6">
        {/* Capacity Slider */}
        <div>
          <Label className="text-[14px] text-slate-900 mb-4 block font-['Arial:Regular',_sans-serif]">
            Maximum Participants: {formData.capacity}
          </Label>

          <div className="space-y-4">
            <input
              type="range"
              min="2"
              max="100"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: Number(e.target.value) }))}
              className="w-full h-2 bg-[#f8f7f4] rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #ff8a00 0%, #ff4d8d ${(formData.capacity - 2) / 98 * 100}%, #f8f7f4 ${(formData.capacity - 2) / 98 * 100}%, #f8f7f4 100%)`
              }}
            />

            <div className="flex justify-between text-[12px] font-['Arial:Regular',_sans-serif] text-slate-600">
              <span>2</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Capacity Info */}
        <div className="bg-[#f8f7f4] rounded-[12px] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-lg flex items-center justify-center">
              <span className="text-white text-[14px] font-['Arial:Bold',_sans-serif]">ℹ</span>
            </div>
            <h4 className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900">
              Capacity Guidelines
            </h4>
          </div>

          <div className="space-y-2 text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-slate-600">
            <p>• Melbourne Cup has 24 horses, so 24 is the traditional maximum</p>
            <p>• For sweeps: Each horse can be drawn by multiple participants</p>
            <p>• For calcuttas: Consider auction dynamics with your group size</p>
            <p>• You can always adjust this later if needed</p>
          </div>
        </div>

        {/* Quick Select Options */}
        <div>
          <Label className="text-[14px] text-slate-900 mb-3 block font-['Arial:Regular',_sans-serif]">
            Quick Select
          </Label>
          <div className="flex gap-2 flex-wrap">
            {[12, 24, 36, 48].map((size) => (
              <button
                key={size}
                onClick={() => setFormData(prev => ({ ...prev, capacity: size }))}
                className={`px-4 py-2 rounded-[8px] border text-[14px] font-['Arial:Regular',_sans-serif] transition-all ${
                  formData.capacity === size
                    ? 'bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white border-transparent'
                    : 'bg-white border-[rgba(0,0,0,0.08)] text-slate-600 hover:border-[rgba(0,0,0,0.16)]'
                }`}
              >
                {size} people
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-1">
          Event Settings
        </h3>
        <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
          Configure additional options for your event
        </p>
      </div>

      <div className="space-y-6">
        {/* Promotional Features */}
        <div>
          <Label className="text-[14px] text-slate-900 mb-3 block font-['Arial:Bold',_sans-serif] font-bold">
            Promotional Features
          </Label>

          <div className="space-y-4">
            {/* Enable Promotions */}
            <div className="flex items-center justify-between p-4 bg-[#f8f7f4] rounded-[12px]">
              <div className="flex-1">
                <h4 className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-1">
                  Enable Promotions
                </h4>
                <p className="text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-slate-600">
                  Show promotional messages to participants
                </p>
              </div>
              <button
                onClick={() => setFormData(prev => ({ ...prev, promoEnabled: !prev.promoEnabled }))}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  formData.promoEnabled ? 'bg-gradient-to-r from-[#ff8a00] to-[#ff4d8d]' : 'bg-slate-300'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  formData.promoEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Promotional Message */}
            {formData.promoEnabled && (
              <div className="space-y-3">
                <Label className="text-[14px] text-slate-900 block font-['Arial:Regular',_sans-serif]">
                  Promotional Message
                </Label>
                <textarea
                  placeholder="e.g. Join our Melbourne Cup sweep and win big!"
                  value={formData.promoMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, promoMessage: e.target.value }))}
                  className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] p-3 font-['Arial:Regular',_sans-serif] text-[14px] resize-none h-20"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[14px] text-slate-900 mb-2 block font-['Arial:Regular',_sans-serif]">
                      Display Duration (hours)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="168"
                      value={formData.promoDuration}
                      onChange={(e) => setFormData(prev => ({ ...prev, promoDuration: Number(e.target.value) }))}
                      className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[36px] px-3 font-['Arial:Regular',_sans-serif]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lead Capture */}
        <div>
          <Label className="text-[14px] text-slate-900 mb-3 block font-['Arial:Bold',_sans-serif] font-bold">
            Participant Management
          </Label>

          <div className="flex items-center justify-between p-4 bg-[#f8f7f4] rounded-[12px]">
            <div className="flex-1">
              <h4 className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-1">
                Lead Capture
              </h4>
              <p className="text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-slate-600">
                Collect participant contact details for future events
              </p>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, leadCapture: !prev.leadCapture }))}
              className={`relative w-12 h-6 rounded-full transition-all ${
                formData.leadCapture ? 'bg-gradient-to-r from-[#ff8a00] to-[#ff4d8d]' : 'bg-slate-300'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                formData.leadCapture ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-orange-50 to-pink-50 border border-[#ff8a00] rounded-[12px] p-4">
          <h4 className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-3">
            Event Summary
          </h4>
          <div className="space-y-2 text-[12px] leading-[16px] font-['Arial:Regular',_sans-serif] text-slate-600">
            <p><strong>Name:</strong> {formData.eventName || 'Not specified'}</p>
            <p><strong>Type:</strong> {formData.eventType === 'sweep' ? 'Melbourne Cup Sweep' : formData.eventType === 'calcutta' ? 'Melbourne Cup Calcutta' : 'Not selected'}</p>
            <p><strong>Date:</strong> {formData.eventDate || 'Not set'} at {formData.eventTime || 'Not set'}</p>
            <p><strong>Entry Fee:</strong> ${formData.entryFee}</p>
            <p><strong>Capacity:</strong> {formData.capacity} participants</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[20px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-[600px] h-[678px] relative">
        {/* Header */}
        <div className="flex items-center justify-between h-[97px] px-6 border-b border-[rgba(0,0,0,0.08)]">
          <div>
            <h2 className="text-[20px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900">
              Create New Event
            </h2>
            <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
              Step {currentStep} of 4
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-9 h-9 p-0 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center pt-6">
          {renderStepIndicator()}
        </div>

        {/* Content */}
        <div className="px-6 py-6 h-[384px] overflow-y-auto">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between h-[93px] px-6 border-t border-[rgba(0,0,0,0.08)]">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[44px] px-4 font-['Arial:Regular',_sans-serif]"
          >
            Cancel
          </Button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[44px] px-4 font-['Arial:Regular',_sans-serif]"
              >
                ← Back
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className={`rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif] ${
                  isStepValid()
                    ? 'bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white'
                    : 'bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white opacity-50'
                }`}
              >
                Next →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif]"
              >
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}