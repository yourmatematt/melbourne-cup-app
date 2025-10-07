'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PrintLayout, { SignatureLine, OfficialSeal } from '@/components/print/print-layout'
import { Loader2, AlertCircle } from 'lucide-react'

interface Assignment {
  horse_number: number
  created_at: string
  event_horses: {
    number: number
    name: string
  }
  patron_entries: {
    participant_name: string
    join_code: string
  }
}

interface DrawResultsData {
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
  assignments: Assignment[]
  drawConductedBy: string
  venueManager: string
}

export default function PrintDrawResultsPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [eventData, setEventData] = useState<DrawResultsData | null>(null)
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

      // Load structured draw results data
      const response = await fetch(`/api/events/${eventId}/print-data?type=draw-results`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load draw results')
      }

      setEventData(data.data)

    } catch (err) {
      console.error('Error loading draw results:', err)
      setError(err instanceof Error ? err.message : 'Failed to load draw results')
    } finally {
      setLoading(false)
    }
  }

  function formatDrawTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('en-AU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading draw results...</p>
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
          <p className="text-gray-600 mb-4">{error || 'Draw results not found'}</p>
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

  const { event, assignments, drawConductedBy, venueManager } = eventData

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Draw Results</h2>
          <p className="text-gray-600 mb-4">The draw has not been completed yet.</p>
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

  // Get the draw time from the first assignment
  const drawTime = assignments[0]?.created_at

  return (
    <PrintLayout
      title="Official Draw Results"
      subtitle={`${event.name} Sweep`}
      event={event}
      autoPrint={false}
      footer="Keep this document for verification"
    >
      {/* Draw Information */}
      <div className="text-center mb-8 keep-together">
        <OfficialSeal>
          <p className="font-bold text-lg">OFFICIAL DRAW</p>
          <p className="text-sm">
            Draw conducted: {drawTime ? formatDrawTime(drawTime) : 'Date TBD'}
          </p>
        </OfficialSeal>
      </div>

      {/* Results Table */}
      <div className="keep-together">
        <h2 className="text-lg font-bold mb-4 text-center">Horse Assignments</h2>

        <table className="w-full">
          <thead>
            <tr>
              <th className="w-20 text-center">Horse #</th>
              <th className="w-1/3 text-left">Horse Name</th>
              <th className="text-left">Participant Name</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.horse_number}>
                <td className="text-center font-bold text-lg">
                  {assignment.horse_number}
                </td>
                <td className="font-medium text-lg">
                  {assignment.event_horses?.name || 'Unknown Horse'}
                </td>
                <td className="font-medium text-lg">
                  {assignment.patron_entries.participant_name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div className="mt-8 keep-together">
        <h3 className="font-semibold mb-3">Instructions for Participants</h3>
        <div className="text-sm space-y-2">
          <p>• Check the race results after the event to see if your horse placed</p>
          <p>• Winners must present valid ID and their entry confirmation to claim prizes</p>
          <p>• All prizes must be claimed at {event.tenants?.name || 'this venue'}</p>
          <p>• Prize claims are subject to verification of participation</p>
        </div>
      </div>

      {/* Verification Section */}
      <div className="mt-12 keep-together">
        <h3 className="font-semibold mb-4">Official Verification</h3>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <SignatureLine label="Draw Conducted By" />
            <p className="text-xs text-gray-600 mt-1">{drawConductedBy}</p>
          </div>
          <div>
            <SignatureLine label="Venue Manager" />
            <p className="text-xs text-gray-600 mt-1">{venueManager}</p>
          </div>
        </div>

        <div className="border border-gray-400 p-4">
          <h4 className="font-semibold mb-2">Draw Certification</h4>
          <div className="text-sm space-y-1">
            <p>✓ Draw conducted using random assignment process</p>
            <p>✓ All participants present at time of draw verified</p>
            <p>✓ No alterations made after completion</p>
            <p>✓ Results recorded accurately as shown above</p>
          </div>

          <div className="mt-4 text-xs">
            <p><strong>Draw Details:</strong></p>
            <p>Total Participants: {assignments.length}</p>
            <p>Method: Random automated assignment</p>
            <p>Timestamp: {drawTime ? new Date(drawTime).toISOString() : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="mt-8 keep-together">
        <h3 className="font-semibold mb-3">Terms and Conditions</h3>
        <div className="text-xs space-y-1">
          <p>• This document constitutes the official record of the draw</p>
          <p>• Disputes must be raised within 24 hours of the draw</p>
          <p>• Prize distribution is subject to race results</p>
          <p>• Management reserves the right to verify all entries</p>
          <p>• Participants must be present to win (where applicable)</p>
        </div>
      </div>

    </PrintLayout>
  )
}