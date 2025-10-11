'use client'

import { NewEventForm } from '@/components/events/new-event-form'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function NewEventContent() {
  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Create New Event</h1>
            <p className="text-slate-600">
              Set up a new Melbourne Cup sweep or calcutta for your venue
            </p>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white border border-gray-200/50 rounded-[20px] p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Event Details</h2>
              <p className="text-slate-600">
                Configure your event settings and horse field
              </p>
            </div>

            <div className="border-t border-gray-200/50 pt-6">
              <NewEventForm />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function NewEventPage() {
  return <NewEventContent />
}