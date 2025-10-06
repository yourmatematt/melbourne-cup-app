'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Short URL redirect to the full entry page
export default function ShortEntryRedirect() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  useEffect(() => {
    if (eventId) {
      // Redirect to the full entry page
      router.replace(`/events/${eventId}/enter`)
    }
  }, [eventId, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}