'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Eye,
  Users,
  Trophy,
  Share2,
  Calendar,
  Clock,
  UserCheck,
  AlertCircle
} from 'lucide-react'

interface SpectatorModeProps {
  event: any
  eventStats: any
}

export function SpectatorMode({ event, eventStats }: SpectatorModeProps) {
  const [assignments, setAssignments] = useState<any[]>([])
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

  // Load assignments and participants
  useEffect(() => {
    async function loadData() {
      try {
        // Load assignments with horse and participant details
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select(`
            *,
            event_horses!event_horse_id(*),
            patron_entries!patron_entry_id(participant_name)
          `)
          .eq('event_id', event.id)
          .order('created_at', { ascending: false })

        if (assignmentData) {
          setAssignments(assignmentData)
        }

        // Load participants
        const { data: participantData } = await supabase
          .from('patron_entries')
          .select('id, participant_name, created_at')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false })

        if (participantData) {
          setParticipants(participantData)
        }
      } catch (error) {
        console.error('Error loading spectator data:', error)
      }
    }

    loadData()

    // Set up realtime subscriptions for live updates
    const channel = supabase
      .channel(`spectator_${event.id}`)
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
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [event.id, supabase])

  const handleShare = async () => {
    const shareData = {
      title: `${event.name} - Melbourne Cup Sweep`,
      text: `Watch the ${event.name} sweep live at ${event.tenant?.name}!`,
      url: window.location.href
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

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  const capacityPercentage = eventStats ? (eventStats.total_entries / event.capacity) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Eye className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Spectator Mode</h1>
          </div>

          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800">
                This event is full, but you can watch the draw and results live!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Event Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>{event.name}</span>
            </CardTitle>
            <CardDescription>
              {event.tenant?.name && `at ${event.tenant.name}`}
            </CardDescription>
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
              <Badge variant="destructive" className="w-full justify-center">
                Event Full
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Race Date:</span>
                <span className="font-medium">{formatEventDate(event.starts_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Event Type:</span>
                <Badge variant="outline" className="capitalize">
                  {event.mode}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Countdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
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

        {/* Live Assignments */}
        {assignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5" />
                <span>Horse Assignments</span>
              </CardTitle>
              <CardDescription>
                Live updates as horses are assigned
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="font-medium">
                      {assignment.patron_entries.participant_name}
                    </span>
                    <div className="text-right">
                      <div className="font-mono">
                        #{assignment.event_horses.number} {assignment.event_horses.name}
                      </div>
                      {assignment.event_horses.jockey && (
                        <div className="text-xs text-gray-500">
                          {assignment.event_horses.jockey}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {assignments.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No horses assigned yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Participants ({participants.length})</span>
            </CardTitle>
            <CardDescription>
              Everyone who joined the sweep
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex justify-between items-center text-sm py-1"
                >
                  <span>{participant.participant_name}</span>
                  <span className="text-gray-500 text-xs">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share This Event
          </Button>

          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>
              Keep this page open to watch the draw and race results live
            </p>
            <p>
              Want to join future events? Contact {event.tenant?.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}