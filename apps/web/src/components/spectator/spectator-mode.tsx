'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Eye,
  Users,
  Trophy,
  Clock,
  Calendar,
  MapPin,
  Wifi,
  WifiOff,
  Zap,
  CheckCircle,
  Info,
  Star
} from 'lucide-react'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'

interface SpectatorModeProps {
  event: any
  eventStats?: any
  participants?: any[]
  assignments?: any[]
  realtimeState?: any
  onJoinWaitlist?: () => void
  className?: string
}

export function SpectatorMode({
  event,
  eventStats,
  participants = [],
  assignments = [],
  realtimeState,
  onJoinWaitlist,
  className = ''
}: SpectatorModeProps) {
  const [showAssignments, setShowAssignments] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Real-time updates for spectator view
  const {
    participants: liveParticipants,
    assignments: liveAssignments,
    event: liveEvent,
    eventStats: liveEventStats
  } = useRealtimeEvent(event.id, {
    includeParticipants: true,
    includeAssignments: true,
    includeEventStatus: true,
    includeStats: true,
    onParticipantAdded: () => setLastUpdate(new Date()),
    onAssignmentAdded: () => setLastUpdate(new Date()),
    onStatusChange: () => setLastUpdate(new Date())
  })

  // Use live data if available, fallback to props
  const currentEvent = liveEvent || event
  const currentStats = liveEventStats || eventStats
  const currentParticipants = liveParticipants || participants
  const currentAssignments = liveAssignments || assignments

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lobby':
        return 'bg-blue-100 text-blue-800'
      case 'drawing':
        return 'bg-yellow-100 text-yellow-800'
      case 'complete':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lobby':
        return <Users className="w-4 h-4" />
      case 'drawing':
        return <Zap className="w-4 h-4" />
      case 'complete':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const canShowAssignments = currentEvent.status !== 'lobby' && currentAssignments.length > 0

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Eye className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Spectator View</h1>
          </div>

          <Badge
            className={`${getStatusColor(currentEvent.status)} text-sm px-3 py-1`}
          >
            {getStatusIcon(currentEvent.status)}
            <span className="ml-1 capitalize">{currentEvent.status}</span>
          </Badge>

          <p className="text-gray-600 max-w-2xl mx-auto">
            This event is at capacity, but you can watch the excitement unfold in real-time!
          </p>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center space-x-2 text-sm"
        >
          {realtimeState?.isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Live updates active</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-orange-600" />
              <span className="text-orange-600">
                {realtimeState?.isReconnecting ? 'Reconnecting...' : 'Connection lost'}
              </span>
            </>
          )}
          <span className="text-gray-500">
            • Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        </motion.div>

        {/* Event Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span>{currentEvent.name}</span>
              </CardTitle>
              <CardDescription className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatEventDate(currentEvent.starts_at)}</span>
                </div>
                {currentEvent.tenant?.name && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 w-4" />
                    <span>{currentEvent.tenant.name}</span>
                  </div>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Capacity Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Event Capacity</span>
                  </span>
                  <span className="font-medium">
                    {currentStats?.total_entries || currentParticipants.length}/{currentEvent.capacity}
                  </span>
                </div>

                <Progress
                  value={((currentStats?.total_entries || currentParticipants.length) / currentEvent.capacity) * 100}
                  className="h-3"
                />

                <div className="flex justify-center">
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    Event Full
                  </Badge>
                </div>
              </div>

              {/* Event Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentStats?.total_entries || currentParticipants.length}
                  </div>
                  <div className="text-sm text-gray-500">Participants</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {currentStats?.assigned_count || currentAssignments.length}
                  </div>
                  <div className="text-sm text-gray-500">Assigned</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {currentEvent.capacity}
                  </div>
                  <div className="text-sm text-gray-500">Capacity</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {currentEvent.mode === 'calcutta' ? 'Calcutta' : 'Sweep'}
                  </div>
                  <div className="text-sm text-gray-500">Type</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Waitlist Option */}
        {currentEvent.status === 'lobby' && onJoinWaitlist && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Join the Waitlist</p>
                    <p className="text-sm text-gray-600">
                      Get notified if spots become available due to cancellations.
                    </p>
                  </div>
                  <Button onClick={onJoinWaitlist} className="ml-4">
                    Join Waitlist
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Live Status Updates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span>Live Status</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {currentEvent.status === 'lobby' && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Waiting for Draw</p>
                      <p className="text-sm text-blue-700">
                        The host will start the random draw soon
                      </p>
                    </div>
                  </div>
                )}

                {currentEvent.status === 'drawing' && (
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <Zap className="w-5 h-5 text-yellow-600 animate-pulse" />
                    <div>
                      <p className="font-medium text-yellow-900">Draw in Progress</p>
                      <p className="text-sm text-yellow-700">
                        Randomly assigning participants to horses
                      </p>
                    </div>
                  </div>
                )}

                {currentEvent.status === 'complete' && (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Event Complete</p>
                      <p className="text-sm text-green-700">
                        All participants have been assigned to horses
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assignment Results */}
        {canShowAssignments && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <span>Horse Assignments</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignments(!showAssignments)}
                  >
                    {showAssignments ? 'Hide' : 'Show'} Assignments
                  </Button>
                </CardTitle>
                <CardDescription>
                  {currentAssignments.length} participants have been assigned to horses
                </CardDescription>
              </CardHeader>

              <AnimatePresence>
                {showAssignments && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent>
                      <div className="grid gap-3 max-h-96 overflow-y-auto">
                        {currentAssignments.map((assignment: any, index: number) => (
                          <motion.div
                            key={assignment.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                          >
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline" className="font-mono">
                                #{assignment.draw_order}
                              </Badge>
                              <div>
                                <div className="font-medium">
                                  {assignment.patron_entry?.participant_name || 'Anonymous'}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-medium flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span>Horse #{assignment.event_horse?.number}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {assignment.event_horse?.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {assignment.event_horse?.jockey}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-500"
        >
          <p>This page updates automatically. No need to refresh!</p>
          <p className="mt-1">
            Contact the venue if you have questions about this event.
          </p>
        </motion.div>
      </div>
    </div>
  )
}