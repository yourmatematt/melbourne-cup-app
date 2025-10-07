'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ParticipantList } from './participant-list'
import { DrawControls } from './draw-controls'
import ExportControls from './export-controls'
import { EventStats } from './event-stats'
import { RealtimeStatusIndicator } from '@/components/realtime/realtime-status-indicator'
import { RealtimeNotificationContainer, useRealtimeNotifications } from '@/components/realtime/realtime-notification'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { Users, Shuffle, Download, BarChart3 } from 'lucide-react'

interface ControlPanelProps {
  event: any
  user: any
}

export function ControlPanel({ event, user }: ControlPanelProps) {
  const [horses, setHorses] = useState<any[]>([])
  const supabase = createClient()

  // Realtime hooks
  const {
    participants,
    assignments,
    event: realtimeEvent,
    eventStats,
    loading,
    realtimeState,
    refreshAll,
    reconnectAll
  } = useRealtimeEvent(event.id, {
    includeParticipants: true,
    includeAssignments: true,
    includeEventStatus: true,
    includeStats: true,
    includeAssignmentRelations: true,
    onParticipantAdded: (participant) => {
      notifications.notifyParticipantAdded(participant)
    },
    onAssignmentAdded: (assignment) => {
      const participant = participants.find(p => p.id === assignment.patron_entry_id)
      const horse = assignment.event_horse
      if (participant && horse) {
        notifications.notifyAssignmentCreated(participant, horse)
      }
    },
    onStatusChange: (event, oldStatus) => {
      notifications.notifyStatusChanged(oldStatus, event.status)
    }
  })

  const notifications = useRealtimeNotifications()

  // Load horses (not included in realtime hook)
  useEffect(() => {
    async function loadHorses() {
      try {
        const { data: horseData } = await supabase
          .from('event_horses')
          .select('*')
          .eq('event_id', event.id)
          .order('number', { ascending: true })

        if (horseData) {
          setHorses(horseData)
        }
      } catch (error) {
        console.error('Error loading horses:', error)
      }
    }

    loadHorses()
  }, [event.id, supabase])

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

  const unassignedParticipants = participants.filter(p =>
    !assignments.some(a => a.patron_entry_id === p.id)
  )

  const availableHorses = horses.filter(h =>
    !h.is_scratched && !assignments.some(a => a.event_horse_id === h.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading control panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      {/* Realtime Status Indicator */}
      <div className="fixed top-4 right-4 z-40">
        <RealtimeStatusIndicator
          realtimeState={realtimeState}
          onReconnect={reconnectAll}
          onRefresh={refreshAll}
          showDetails={true}
        />
      </div>

      {/* Realtime Notifications */}
      <RealtimeNotificationContainer
        notifications={notifications.notifications}
        onDismiss={notifications.dismissNotification}
        position="top-right"
        maxVisible={4}
      />

      {/* Event Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Event Overview</span>
                <Badge variant="outline" className="capitalize">
                  {event.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {formatEventDate(event.starts_at)}
              </CardDescription>
            </div>

            <div className="text-right space-y-1">
              <div className="text-2xl font-bold">
                {participants.length}/{event.capacity}
              </div>
              <div className="text-sm text-gray-500">Participants</div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {assignments.length}
              </div>
              <div className="text-sm text-blue-600">Assigned</div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {unassignedParticipants.length}
              </div>
              <div className="text-sm text-yellow-600">Waiting</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {availableHorses.length}
              </div>
              <div className="text-sm text-green-600">Available Horses</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {horses.filter(h => h.is_scratched).length}
              </div>
              <div className="text-sm text-purple-600">Scratched</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Control Tabs */}
      <Tabs defaultValue="participants" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="participants" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Participants</span>
          </TabsTrigger>
          <TabsTrigger value="draw" className="flex items-center space-x-2">
            <Shuffle className="w-4 h-4" />
            <span>Draw</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Stats</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="mt-6">
          <ParticipantList
            event={realtimeEvent || event}
            participants={participants}
            assignments={assignments}
            horses={horses}
            onDataChange={refreshAll}
            realtimeState={realtimeState}
          />
        </TabsContent>

        <TabsContent value="draw" className="mt-6">
          <DrawControls
            event={realtimeEvent || event}
            participants={participants}
            assignments={assignments}
            horses={horses}
            unassignedParticipants={unassignedParticipants}
            availableHorses={availableHorses}
            onDataChange={refreshAll}
            realtimeState={realtimeState}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <EventStats
            event={realtimeEvent || event}
            participants={participants}
            assignments={assignments}
            horses={horses}
            eventStats={eventStats}
            realtimeState={realtimeState}
          />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <ExportControls
            eventId={event.id}
            event={realtimeEvent || event}
            stats={{
              participantCount: eventStats?.total_entries || 0,
              assignmentCount: eventStats?.total_assignments || 0,
              hasResults: (realtimeEvent || event)?.results_status === 'final'
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}