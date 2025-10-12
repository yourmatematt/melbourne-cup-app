'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowRight,
  Trophy,
  Users,
  DollarSign,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react'

type EventType = 'sweep' | 'calcutta' | null

export default function CreateEventTypePage() {
  const [selectedType, setSelectedType] = useState<EventType>(null)
  const router = useRouter()

  const handleContinue = () => {
    if (selectedType) {
      // Store the selected type in localStorage for the next step
      localStorage.setItem('selectedEventType', selectedType)
      router.push('/dashboard/events/new')
    }
  }

  const eventTypes = [
    {
      id: 'sweep' as const,
      title: 'Sweep',
      subtitle: 'Traditional random draw format',
      description: 'Participants pay a fixed entry fee and horses are randomly drawn. Simple, fair, and perfect for casual events.',
      badge: 'Most Popular',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      features: [
        'Fixed entry fee for all participants',
        'Horses randomly assigned via draw',
        'Equal chance for everyone to win',
        'Quick and simple setup'
      ],
      icon: Trophy,
      buttonVariant: 'primary' as const,
      buttonText: 'Choose Sweep',
      buttonIcon: ArrowRight
    },
    {
      id: 'calcutta' as const,
      title: 'Calcutta',
      subtitle: 'Auction-style bidding format',
      description: 'Horses are auctioned to the highest bidder. More competitive format with potentially higher prizes.',
      badge: 'Advanced',
      badgeColor: 'bg-violet-100 text-violet-700 border-violet-200',
      features: [
        'Auction-style horse bidding',
        'Higher potential prize pools',
        'Competitive atmosphere',
        'Strategic participant engagement'
      ],
      icon: TrendingUp,
      buttonVariant: 'secondary' as const,
      buttonText: 'Choose Calcutta',
      buttonIcon: ArrowRight
    }
  ]

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Event</h1>
            <p className="text-slate-600">Choose your event format to get started</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                1
              </div>
              <span className="ml-3 text-sm font-medium text-slate-900">Event Type</span>
            </div>
            <div className="flex-1 h-px bg-slate-200"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-medium text-sm">
                2
              </div>
              <span className="ml-3 text-sm text-slate-500">Event Details</span>
            </div>
            <div className="flex-1 h-px bg-slate-200"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-medium text-sm">
                3
              </div>
              <span className="ml-3 text-sm text-slate-500">Horse Field</span>
            </div>
          </div>
        </div>

        {/* Event Type Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {eventTypes.map((type) => {
            const isSelected = selectedType === type.id
            const ButtonIcon = type.buttonIcon
            const TypeIcon = type.icon

            return (
              <div
                key={type.id}
                className={`relative bg-white border-2 rounded-[20px] p-8 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-500 shadow-lg ring-4 ring-purple-100'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => setSelectedType(type.id)}
              >
                {/* Badge */}
                <div className="absolute top-6 right-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${type.badgeColor}`}>
                    {type.badge}
                  </span>
                </div>

                {/* Header */}
                <div className="mb-6">
                  <div className={`rounded-[20px] w-12 h-12 flex items-center justify-center mb-4 ${
                    type.buttonVariant === 'primary' ? 'bg-slate-100' : 'bg-violet-100'
                  }`}>
                    <TypeIcon className={`h-6 w-6 ${
                      type.buttonVariant === 'primary' ? 'text-slate-600' : 'text-violet-500'
                    }`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{type.title}</h3>
                  <p className="text-slate-600 text-sm">{type.subtitle}</p>
                </div>

                {/* Description */}
                <p className="text-slate-600 mb-6">{type.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {type.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="text-violet-500 mt-1 text-base">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Selection Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedType(type.id)
                  }}
                  className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg'
                      : type.buttonVariant === 'primary'
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-[#f8f7f4] border-2 border-violet-200/60 text-violet-500 hover:bg-violet-50'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <span>Selected</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <ButtonIcon className="h-4 w-4" />
                      {type.buttonText}
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            className={`px-8 py-3 rounded-xl font-medium transition-all ${
              selectedType
                ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg hover:opacity-90'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            Continue to Event Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}