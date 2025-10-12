'use client'

import { NewEventForm } from '@/components/events/new-event-form'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewEventPage() {
  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/events/create">
            <Button variant="ghost" className="mb-4 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event Type
            </Button>
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Event</h1>
            <p className="text-slate-600">Configure your event settings and horse field</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                ✓
              </div>
              <span className="ml-3 text-sm text-slate-500">Event Type</span>
            </div>
            <div className="flex-1 h-px bg-slate-200"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                2
              </div>
              <span className="ml-3 text-sm font-medium text-slate-900">Event Details</span>
            </div>
            <div className="flex-1 h-px bg-slate-200"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                3
              </div>
              <span className="ml-3 text-sm font-medium text-slate-900">Horse Field</span>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-[20px] border border-gray-200/50 shadow-sm">
          <NewEventForm />
        </div>
      </div>
    </DashboardLayout>
  )
}