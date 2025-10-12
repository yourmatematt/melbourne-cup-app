'use client'

import { EventCreationWizard } from '@/components/events/event-creation-wizard'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function NewEventPage() {
  return (
    <DashboardLayout>
      <EventCreationWizard />
    </DashboardLayout>
  )
}