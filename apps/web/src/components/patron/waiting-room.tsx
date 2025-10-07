'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  Users,
  Trophy,
  Share2,
  RefreshCw,
  Sparkles,
  Calendar
} from 'lucide-react'

interface WaitingRoomProps {
  event: any
  patronEntry: any
}

export function WaitingRoom({ event, patronEntry }: WaitingRoomProps) {
  const [eventStats, setEventStats] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [timeUntilRace, setTimeUntilRace] = useState<string>('')
  const supabase = createClient()

  // Calculate time until race
  useEffect(() => {
    const updateCountdown = () => {
      const raceTime = new Date(event.starts_at).getTime()
      const now = new Date().getTime()
      const timeDiff = raceTime - now

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

        if (days > 0) {
          setTimeUntilRace(`${days}d ${hours}h ${minutes}m`)
        } else if (hours > 0) {
          setTimeUntilRace(`${hours}h ${minutes}m ${seconds}s`)
        } else {
          setTimeUntilRace(`${minutes}m ${seconds}s`)
        }
      } else {
        setTimeUntilRace('Race started!')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [event.starts_at])

  // Load data and set up realtime subscriptions
  useEffect(() => {
    async function loadData() {
      try {
        // Load event stats
        const { data: stats } = await supabase
          .rpc('get_event_stats', { event_uuid: event.id })

        if (stats?.[0]) {
          setEventStats(stats[0])
        }

        // Check for assignment
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select(`
            *,
            event_horse:event_horses(*)
          `)
          .eq('patron_entry_id', patronEntry.id)
          .single()

        if (assignmentData) {
          setAssignment(assignmentData)
        }

        // Load recent participants
        const { data: participantData } = await supabase
          .from('patron_entries')
          .select('id, participant_name, created_at')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (participantData) {
          setParticipants(participantData)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()

    // Set up realtime subscriptions
    const channel = supabase
      .channel(`waiting_room_${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patron_entries',
          filter: `event_id=eq.${event.id}`
        },
        () => {
          loadData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `event_id=eq.${event.id}`
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [event.id, patronEntry.id, supabase])

  const handleShare = async () => {
    const shareData = {
      title: `${event.name} - Melbourne Cup Sweep`,
      text: `Join me in the ${event.name} sweep at ${event.tenant?.name}!`,
      url: window.location.origin + window.location.pathname
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const capacityPercentage = eventStats ? (eventStats.total_entries / event.capacity) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          </div>

          <div className="space-y-1">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {patronEntry.join_code}
            </Badge>
            <p className="text-sm text-gray-600">Your join code</p>
          </div>
        </div>

        {/* Assignment Card (if assigned) */}
        {assignment && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2 text-green-800">
                <Sparkles className="w-5 h-5" />
                <span>Your Horse</span>
                <Sparkles className="w-5 h-5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                <div className="text-2xl font-bold text-green-800 mb-1">
                  #{assignment.event_horse.number} {assignment.event_horse.name}
                </div>
                {assignment.event_horse.jockey && (
                  <div className="text-sm text-green-600">
                    Jockey: {assignment.event_horse.jockey}
                  </div>
                )}
              </div>
              <p className="text-sm text-green-700">
                🎉 Good luck! You've been assigned your horse.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Waiting for Assignment */}
        {!assignment && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Waiting for Draw</span>
              </CardTitle>
              <CardDescription>
                The draw hasn't started yet. You'll be assigned a horse soon!
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center space-y-4">
              <div className="animate-pulse">
                <div className="bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-lg p-4">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="font-medium">Draw starting soon...</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Horse assignments will be made randomly. Keep this page open to see your horse!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Countdown to Race */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Race Countdown</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="text-center space-y-3">
            <div className="text-3xl font-mono font-bold text-blue-600">
              {timeUntilRace}
            </div>
            <p className="text-sm text-gray-600">
              Until the Melbourne Cup starts
            </p>
          </CardContent>
        </Card>

        {/* Event Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Event Status</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Participants</span>
                <span className="font-medium">
                  {eventStats?.total_entries || 0}/{event.capacity}
                </span>
              </div>
              <Progress value={capacityPercentage} className="h-2" />
            </div>

            <div className="flex justify-between items-center">
              <Badge variant="outline" className="capitalize">
                {event.status}
              </Badge>
              <Badge variant="secondary">
                {event.mode}
              </Badge>
            </div>

            {eventStats?.total_assignments > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  🎲 {eventStats.total_assignments} horses have been assigned so far
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Participants */}
        {participants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Joins</CardTitle>
              <CardDescription>
                Latest participants to join the sweep
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                {participants.slice(0, 5).map((participant, index) => (
                  <div key={participant.id} className="flex justify-between items-center text-sm">
                    <span className="truncate">
                      {participant.participant_name}
                      {participant.id === patronEntry.id && (
                        <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                      )}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatTime(participant.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Invite Friends
          </Button>

          <div className="text-center text-xs text-gray-500">
            <p>
              Keep this page open for live updates about the draw and race results
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}