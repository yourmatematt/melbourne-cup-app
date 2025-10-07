'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Users,
  Trophy,
  Crown,
  MapPin,
  Clock,
  Loader2,
  RefreshCw,
  Medal,
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Event {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  participant_count?: number
  tenant: {
    name: string
  }
}

interface Assignment {
  id: string
  patron_entry: {
    participant_name: string
  }
  event_horse: {
    number: number
    name: string
    jockey?: string
  }
  created_at: string
}

interface Result {
  id: string
  place: number
  event_horse_id: string | null
  patron_entry_id: string | null
  prize_amount: number | null
  collected: boolean
  collected_at: string | null
  patron_entries: {
    participant_name: string
  } | null
  event_horses: {
    number: number
    name: string
  } | null
}

export default function LiveViewPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    if (eventId) {
      loadEventData()

      // Set up real-time updates
      const channel = supabase
        .channel(`event_${eventId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'patron_entries', filter: `event_id=eq.${eventId}` },
          () => loadEventData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'assignments', filter: `event_id=eq.${eventId}` },
          () => loadEventData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'event_results', filter: `event_id=eq.${eventId}` },
          () => loadEventData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
          () => loadEventData()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [eventId])

  async function loadEventData() {
    try {
      setError(null)

      // Get event details (public access, bypasses RLS)
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'GET'
      })

      if (!response.ok) {
        setError('Event not found')
        return
      }

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to load event')
        return
      }

      setEvent({
        ...data.data.event,
        participant_count: data.data.participantCount
      })

      // Get assignments (if any)
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          id,
          created_at,
          patron_entries!patron_entry_id (
            participant_name
          ),
          event_horses!event_horse_id (
            number,
            name,
            jockey
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (!assignmentError && assignmentData) {
        const formattedAssignments = assignmentData.map(assignment => ({
          id: assignment.id,
          created_at: assignment.created_at,
          patron_entry: assignment.patron_entries,
          event_horse: assignment.event_horses
        }))
        setAssignments(formattedAssignments)
      }

      // Get results (if event is completed)
      if (data.data.event.status === 'completed') {
        const { data: resultsData, error: resultsError } = await supabase
          .from('event_results')
          .select(`
            id,
            place,
            event_horse_id,
            patron_entry_id,
            prize_amount,
            collected,
            collected_at,
            patron_entries!patron_entry_id (
              participant_name
            ),
            event_horses!event_horse_id (
              number,
              name
            )
          `)
          .eq('event_id', eventId)
          .order('place')

        if (!resultsError && resultsData) {
          setResults(resultsData)
        }
      }

      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error loading live data:', err)
      setError('Failed to load event data')
    } finally {
      setLoading(false)
    }
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  function getStatusBadge(status: string) {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      drawing: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    const labels = {
      draft: 'Coming Soon',
      active: 'Join Now!',
      drawing: 'Draw in Progress',
      completed: 'Event Complete',
      cancelled: 'Cancelled'
    }

    return (
      <Badge className={colors[status] || colors.draft}>
        {labels[status] || status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading live event...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Event Unavailable</CardTitle>
            <CardDescription>{error || 'Event not found'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            {event.name}
          </h1>
          <div className="flex justify-center mb-4">
            {getStatusBadge(event.status)}
          </div>
          <p className="text-xl text-gray-600 mb-2">{event.tenant.name}</p>
          <div className="flex items-center justify-center space-x-4 text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDateTime(event.starts_at)}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Participants</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {event.participant_count || 0}
              </div>
              <div className="text-sm text-gray-500">
                of {event.capacity} spots
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(((event.participant_count || 0) / event.capacity) * 100, 100)}%`
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span>Assignments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-yellow-600 mb-2">
                {assignments.length}
              </div>
              <div className="text-sm text-gray-500">
                horses assigned
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-center space-x-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span>Last Update</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium text-green-600 mb-2">
                {lastUpdate.toLocaleTimeString('en-AU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={loadEventData}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Winners Section - Only show if event is completed and has results */}
        {event.status === 'completed' && results.length > 0 && (
          <div className="space-y-6">
            {/* Main Winner */}
            {results.find(r => r.place === 1) && (
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300">
                <CardContent className="text-center py-8">
                  <div className="flex justify-center mb-4">
                    <Crown className="h-16 w-16 text-yellow-600" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-yellow-800 mb-2">
                    🏆 MELBOURNE CUP WINNER! 🏆
                  </h2>
                  {(() => {
                    const winner = results.find(r => r.place === 1)
                    return winner && (
                      <>
                        <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                          {winner.patron_entries?.participant_name || 'Unknown Winner'}
                        </div>
                        {winner.event_horses && (
                          <div className="text-xl md:text-2xl text-gray-700 mb-4">
                            Horse #{winner.event_horses.number} - {winner.event_horses.name}
                          </div>
                        )}
                        {winner.prize_amount && (
                          <div className="text-2xl md:text-3xl font-bold text-green-700">
                            Prize: {formatCurrency(winner.prize_amount)}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Second and Third Place */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Second Place */}
              {results.find(r => r.place === 2) && (
                <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300">
                  <CardContent className="text-center py-6">
                    <div className="flex justify-center mb-3">
                      <Medal className="h-12 w-12 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">🥈 Second Place</h3>
                    {(() => {
                      const second = results.find(r => r.place === 2)
                      return second && (
                        <>
                          <div className="text-lg font-bold text-gray-900 mb-1">
                            {second.patron_entries?.participant_name || 'Unknown'}
                          </div>
                          {second.event_horses && (
                            <div className="text-sm text-gray-600 mb-3">
                              Horse #{second.event_horses.number} - {second.event_horses.name}
                            </div>
                          )}
                          {second.prize_amount && (
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(second.prize_amount)}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Third Place */}
              {results.find(r => r.place === 3) && (
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300">
                  <CardContent className="text-center py-6">
                    <div className="flex justify-center mb-3">
                      <Award className="h-12 w-12 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-orange-800 mb-2">🥉 Third Place</h3>
                    {(() => {
                      const third = results.find(r => r.place === 3)
                      return third && (
                        <>
                          <div className="text-lg font-bold text-gray-900 mb-1">
                            {third.patron_entries?.participant_name || 'Unknown'}
                          </div>
                          {third.event_horses && (
                            <div className="text-sm text-gray-600 mb-3">
                              Horse #{third.event_horses.number} - {third.event_horses.name}
                            </div>
                          )}
                          {third.prize_amount && (
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(third.prize_amount)}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Recent Assignments */}
        {assignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5" />
                <span>Recent Horse Assignments</span>
              </CardTitle>
              <CardDescription>
                Latest participant to horse assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {assignments.slice(0, 10).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex justify-between items-center p-3 bg-white rounded-lg border"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {assignment.patron_entry.participant_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(assignment.created_at).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg">
                        #{assignment.event_horse.number} {assignment.event_horse.name}
                      </div>
                      {assignment.event_horse.jockey && (
                        <div className="text-sm text-gray-500">
                          {assignment.event_horse.jockey}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Assignments Message */}
        {assignments.length === 0 && event.status === 'active' && (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No Horse Assignments Yet
              </h3>
              <p className="text-gray-500">
                Assignments will appear here when the draw begins
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-4">
          <p>Live updates • Refreshes automatically</p>
          <p className="mt-1">Melbourne Cup Manager</p>
        </div>
      </div>
    </div>
  )
}