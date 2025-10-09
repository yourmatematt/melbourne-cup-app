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
  Award,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRealtimeAssignments } from '@/hooks/use-realtime-assignments'
import { useRealtimeParticipants } from '@/hooks/use-realtime-participants'

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
  patron_entry_id: string
  event_horse_id: string
  created_at: string
  patron_entries?: {
    participant_name: string
  }
  event_horses?: {
    number: number
    name: string
    jockey?: string
  }
}

interface RecentAssignment {
  id: string
  participant_name: string
  horse_number: number
  horse_name: string
  jockey?: string
  created_at: string
  isNew?: boolean
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
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([])
  const [newAssignmentId, setNewAssignmentId] = useState<string | null>(null)

  // Use the real-time assignments hook with relations
  const {
    assignments,
    loading: assignmentsLoading,
    realtimeState: assignmentsRealtimeState
  } = useRealtimeAssignments(eventId, {
    includeRelations: true,
    onAssignmentAdded: (assignment) => {
      // Handle new assignment with animation
      setNewAssignmentId(assignment.id)
      setLastUpdate(new Date())

      // Show flash animation and sound effect (optional)
      console.log('🎉 New assignment:', assignment)

      // Clear the "new" indicator after animation
      setTimeout(() => {
        setNewAssignmentId(null)
      }, 3000)
    },
    onError: (error) => {
      console.error('Assignment subscription error:', error)
    }
  })

  // Use the real-time participants hook
  const {
    participants,
    loading: participantsLoading,
    realtimeState: participantsRealtimeState
  } = useRealtimeParticipants(eventId, {
    onParticipantAdded: (participant) => {
      console.log('🆕 New participant:', participant)
      setLastUpdate(new Date())

      // Update event participant count in real-time
      setEvent(prev => prev ? {
        ...prev,
        participant_count: (prev.participant_count || 0) + 1
      } : null)
    },
    onParticipantRemoved: (participantId) => {
      console.log('🗑️ Participant removed:', participantId)
      setLastUpdate(new Date())

      // Update event participant count in real-time
      setEvent(prev => prev ? {
        ...prev,
        participant_count: Math.max((prev.participant_count || 1) - 1, 0)
      } : null)
    },
    onError: (error) => {
      console.error('Participants subscription error:', error)
    }
  })

  // Combined realtime state
  const realtimeState = {
    isConnected: assignmentsRealtimeState.isConnected && participantsRealtimeState.isConnected,
    isReconnecting: assignmentsRealtimeState.isReconnecting || participantsRealtimeState.isReconnecting,
    error: assignmentsRealtimeState.error || participantsRealtimeState.error,
    lastUpdated: assignmentsRealtimeState.lastUpdated || participantsRealtimeState.lastUpdated
  }

  // Convert assignments to recent assignments format
  useEffect(() => {
    const formatted = assignments
      .filter(a => a.patron_entries && a.event_horses)
      .map(assignment => ({
        id: assignment.id,
        participant_name: assignment.patron_entries?.participant_name || 'Unknown',
        horse_number: assignment.event_horses?.number || 0,
        horse_name: assignment.event_horses?.name || 'Unknown Horse',
        jockey: assignment.event_horses?.jockey,
        created_at: assignment.created_at,
        isNew: assignment.id === newAssignmentId
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setRecentAssignments(formatted)
  }, [assignments, newAssignmentId])

  useEffect(() => {
    if (eventId) {
      loadEventData()

      // Set up real-time updates for results and event status
      const channel = supabase
        .channel(`event_status_${eventId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'event_results', filter: `event_id=eq.${eventId}` },
          (payload) => {
            console.log('🏆 Results updated:', payload)
            loadEventData() // Reload results when they change
            setLastUpdate(new Date())
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
          (payload) => {
            console.log('📅 Event status updated:', payload)
            // Update event data in real-time
            const updatedEvent = payload.new as Event
            setEvent(prev => prev ? {
              ...prev,
              status: updatedEvent.status
            } : null)

            // If event becomes completed, reload to get results
            if (updatedEvent.status === 'completed') {
              loadEventData()
            }

            setLastUpdate(new Date())
          }
        )
        .subscribe((status) => {
          console.log(`Event status subscription: ${status}`)
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [eventId, supabase])

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

      // Assignments are now handled by the useRealtimeAssignments hook

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

  if (loading || assignmentsLoading || participantsLoading) {
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
              <div className="text-4xl font-bold text-blue-600 mb-2 flex items-center justify-center space-x-2">
                <span>{participants.length}</span>
                {participantsRealtimeState.isConnected && (
                  <Zap className="h-5 w-5 text-green-500" title="Live participant updates active" />
                )}
              </div>
              <div className="text-sm text-gray-500">
                of {event.capacity} spots
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((participants.length / event.capacity) * 100, 100)}%`
                  }}
                />
              </div>
              {!participantsRealtimeState.isConnected && participantsRealtimeState.error && (
                <div className="text-xs text-red-500 mt-1">
                  Participant updates offline
                </div>
              )}
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
              <div className="text-4xl font-bold text-yellow-600 mb-2 flex items-center justify-center space-x-2">
                <span>{assignments.length}</span>
                {realtimeState.isConnected && (
                  <Zap className="h-5 w-5 text-green-500" title="Live updates active" />
                )}
              </div>
              <div className="text-sm text-gray-500">
                horses assigned
              </div>
              {!realtimeState.isConnected && realtimeState.error && (
                <div className="text-xs text-red-500 mt-1">
                  Connection lost
                </div>
              )}
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
        {recentAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5" />
                <span>Recent Horse Assignments</span>
                {realtimeState.isConnected && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Zap className="h-3 w-3 mr-1" />
                    LIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Latest participant to horse assignments • Updates automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentAssignments.slice(0, 10).map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`
                      flex justify-between items-center p-3 rounded-lg border transition-all duration-500
                      ${
                        assignment.isNew
                          ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 shadow-lg transform scale-105'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div>
                      <div className="font-medium text-gray-900 flex items-center space-x-2">
                        <span>{assignment.participant_name}</span>
                        {assignment.isNew && (
                          <Badge className="bg-yellow-500 text-yellow-900 text-xs animate-pulse">
                            NEW!
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(assignment.created_at).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`
                        font-mono font-bold text-lg transition-colors duration-300
                        ${assignment.isNew ? 'text-yellow-700' : 'text-gray-900'}
                      `}>
                        #{assignment.horse_number} {assignment.horse_name}
                      </div>
                      {assignment.jockey && (
                        <div className="text-sm text-gray-500">
                          {assignment.jockey}
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
        {recentAssignments.length === 0 && event.status === 'active' && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="flex justify-center mb-4">
                <Trophy className="h-16 w-16 text-gray-400" />
                {realtimeState.isConnected && (
                  <Zap className="h-6 w-6 text-green-500 ml-2 animate-pulse" />
                )}
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No Horse Assignments Yet
              </h3>
              <p className="text-gray-500 mb-2">
                Assignments will appear here when the draw begins
              </p>
              {realtimeState.isConnected ? (
                <p className="text-green-600 text-sm flex items-center justify-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span>Live updates active - ready to show new assignments</span>
                </p>
              ) : (
                <p className="text-red-500 text-sm">
                  ⚠️ Connection lost - refresh to see latest assignments
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-4">
          <div className="flex flex-col items-center space-y-2 mb-4">
            {/* Overall Connection Status */}
            <div className="flex items-center space-x-1">
              {realtimeState.isConnected ? (
                <>
                  <Zap className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">All live updates active</span>
                </>
              ) : realtimeState.isReconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                  <span className="text-yellow-600 font-medium">Reconnecting...</span>
                </>
              ) : (
                <>
                  <div className="h-4 w-4 rounded-full bg-red-500"></div>
                  <span className="text-red-600 font-medium">Connection issues</span>
                </>
              )}
            </div>

            {/* Detailed Connection Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center justify-center space-x-1">
                {assignmentsRealtimeState.isConnected ? (
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                )}
                <span>Assignments</span>
              </div>
              <div className="flex items-center justify-center space-x-1">
                {participantsRealtimeState.isConnected ? (
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                )}
                <span>Participants</span>
              </div>
              <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Results & Status</span>
              </div>
            </div>

            {/* Last Update Time */}
            <div className="text-gray-400">
              Last update: {lastUpdate.toLocaleTimeString('en-AU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>
          <p>Melbourne Cup Manager</p>
        </div>
      </div>
    </div>
  )
}