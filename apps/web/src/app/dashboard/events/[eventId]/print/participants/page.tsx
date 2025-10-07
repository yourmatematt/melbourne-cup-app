'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PrintLayout, { SignatureLine, PageBreak } from '@/components/print/print-layout'
import { Loader2, AlertCircle } from 'lucide-react'

interface Participant {
  id: string
  participant_name: string
  email?: string
  phone?: string
  join_code: string
  entry_method: 'manual' | 'self-registered'
  payment_status: 'free' | 'pending' | 'paid'
  created_at: string
  assignments?: {
    horse_number: number
  }[]
}

interface EventData {
  event: {
    id: string
    name: string
    starts_at: string
    capacity: number
    status: string
    tenants?: {
      id: string
      name: string
    }
  }
  stats: {
    participantCount: number
    assignmentCount: number
  }
  participants: Participant[]
}

export default function PrintParticipantListPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [eventData, setEventData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (eventId) {
      loadEventData()
    }
  }, [eventId])

  async function loadEventData() {
    try {
      setLoading(true)
      setError(null)

      // Load structured participant data for printing
      const response = await fetch(`/api/events/${eventId}/print-data?type=participants`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load event data')
      }

      setEventData(data.data)

    } catch (err) {
      console.error('Error loading event data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event data')
    } finally {
      setLoading(false)
    }
  }

  function formatEntryTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  function getPaymentStatusText(status: string) {
    switch (status) {
      case 'paid': return 'Paid'
      case 'pending': return 'Pending'
      case 'free': return 'Free'
      default: return 'Unknown'
    }
  }

  function getEntryMethodText(method: string) {
    switch (method) {
      case 'manual': return 'Staff'
      case 'self-registered': return 'Online'
      default: return method
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading participant list...</p>
        </div>
      </div>
    )
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error || 'Event not found'}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  const { event, stats, participants } = eventData
  const participantsPerPage = 25
  const totalPages = Math.ceil(participants.length / participantsPerPage)

  return (
    <PrintLayout
      title="Participant List"
      subtitle={`Total Participants: ${stats?.participantCount || 0}/${event.capacity}`}
      event={event}
      autoPrint={false}
      totalPages={totalPages}
    >
      {/* Summary Information */}
      <div className="keep-together mb-6">
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Event Details</h3>
            <p><strong>Status:</strong> {event.status.charAt(0).toUpperCase() + event.status.slice(1)}</p>
            <p><strong>Capacity:</strong> {event.capacity} participants</p>
            <p><strong>Registered:</strong> {stats?.participantCount || 0} participants</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Draw Status</h3>
            <p><strong>Assignments:</strong> {stats?.assignmentCount || 0} completed</p>
            <p><strong>Remaining:</strong> {(stats?.participantCount || 0) - (stats?.assignmentCount || 0)} unassigned</p>
            <p><strong>Progress:</strong> {Math.round(((stats?.assignmentCount || 0) / (stats?.participantCount || 1)) * 100) || 0}% complete</p>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      {Array.from({ length: totalPages }, (_, pageIndex) => {
        const startIndex = pageIndex * participantsPerPage
        const endIndex = Math.min(startIndex + participantsPerPage, participants.length)
        const pageParticipants = participants.slice(startIndex, endIndex)

        return (
          <div key={pageIndex} className={pageIndex > 0 ? "page-break-before" : ""}>
            {pageIndex > 0 && (
              <div className="mb-4">
                <h2>Participant List (continued)</h2>
                <p className="text-sm">Page {pageIndex + 1} of {totalPages}</p>
              </div>
            )}

            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-12">No.</th>
                  <th className="w-48">Participant Name</th>
                  <th className="w-16">Horse</th>
                  <th className="w-24">Entry Code</th>
                  <th className="w-20">Entry Method</th>
                  <th className="w-16">Payment</th>
                  <th className="w-20">Entry Time</th>
                </tr>
              </thead>
              <tbody>
                {pageParticipants.map((participant, index) => {
                  const rowNumber = startIndex + index + 1
                  const horseNumber = participant.assignments?.[0]?.horse_number

                  return (
                    <tr key={participant.id}>
                      <td className="text-center font-mono">{rowNumber}</td>
                      <td className="font-medium">{participant.participant_name}</td>
                      <td className="text-center font-mono">
                        {horseNumber ? `#${horseNumber}` : '-'}
                      </td>
                      <td className="text-center font-mono">{participant.join_code}</td>
                      <td className="text-center text-xs">{getEntryMethodText(participant.entry_method)}</td>
                      <td className="text-center text-xs">{getPaymentStatusText(participant.payment_status)}</td>
                      <td className="text-center text-xs">{formatEntryTime(participant.created_at)}</td>
                    </tr>
                  )
                })}

                {/* Fill empty rows for consistent page layout */}
                {Array.from({ length: participantsPerPage - pageParticipants.length }, (_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="text-center">-</td>
                    <td>-</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Page footer information */}
            {pageIndex === totalPages - 1 && (
              <>
                <div className="mt-8 keep-together">
                  <h3 className="font-semibold mb-2">Legend</h3>
                  <div className="text-xs grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Entry Methods:</strong></p>
                      <p>• Online - Self-registered via QR code/link</p>
                      <p>• Staff - Manually entered by venue staff</p>
                    </div>
                    <div>
                      <p><strong>Payment Status:</strong></p>
                      <p>• Paid - Payment completed</p>
                      <p>• Pending - Payment required</p>
                      <p>• Free - No payment required</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 keep-together">
                  <h3 className="font-semibold mb-4">Verification</h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <SignatureLine label="Venue Manager Signature" />
                    </div>
                    <div>
                      <SignatureLine label="Date" width="100pt" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 border border-gray-400 text-xs">
                  <p className="font-semibold mb-1">Important Notes:</p>
                  <ul className="space-y-1">
                    <li>• This document serves as the official participant record for this event</li>
                    <li>• Entry codes are unique identifiers for each participant</li>
                    <li>• Horse assignments are made through the official draw process</li>
                    <li>• Keep this document for verification and compliance purposes</li>
                  </ul>
                </div>
              </>
            )}

            {pageIndex < totalPages - 1 && <PageBreak />}
          </div>
        )
      })}
    </PrintLayout>
  )
}