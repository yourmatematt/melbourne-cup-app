'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  Users,
  Target,
  Clock,
  Trophy,
  TrendingUp,
  Calendar,
  Percent,
  Hash
} from 'lucide-react'

interface EventStatsProps {
  event: any
  participants: any[]
  assignments: any[]
  horses: any[]
  eventStats: any
}

export function EventStats({
  event,
  participants,
  assignments,
  horses,
  eventStats
}: EventStatsProps) {
  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getJoinRate = () => {
    if (participants.length === 0) return []

    const joinsByHour: { [key: string]: number } = {}

    participants.forEach(participant => {
      const hour = new Date(participant.created_at).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit'
      })
      joinsByHour[hour] = (joinsByHour[hour] || 0) + 1
    })

    return Object.entries(joinsByHour)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(-10) // Last 10 time periods
  }

  const getHorseAssignmentStats = () => {
    const availableHorses = horses.filter(h => !h.is_scratched)
    const assignedHorses = horses.filter(h =>
      !h.is_scratched && assignments.some(a => a.event_horse_id === h.id)
    )
    const scratchedHorses = horses.filter(h => h.is_scratched)

    return {
      total: horses.length,
      available: availableHorses.length,
      assigned: assignedHorses.length,
      unassigned: availableHorses.length - assignedHorses.length,
      scratched: scratchedHorses.length,
      assignmentRate: availableHorses.length > 0 ? (assignedHorses.length / availableHorses.length) * 100 : 0
    }
  }

  const getParticipantStats = () => {
    const assignedParticipants = participants.filter(p =>
      assignments.some(a => a.patron_entry_id === p.id)
    )
    const unassignedParticipants = participants.filter(p =>
      !assignments.some(a => a.patron_entry_id === p.id)
    )
    const withEmail = participants.filter(p => p.email && p.email.length > 0)
    const withPhone = participants.filter(p => p.phone && p.phone.length > 0)
    const withConsent = participants.filter(p => p.consent)

    return {
      total: participants.length,
      assigned: assignedParticipants.length,
      unassigned: unassignedParticipants.length,
      withEmail: withEmail.length,
      withPhone: withPhone.length,
      withConsent: withConsent.length,
      capacityUsed: event.capacity > 0 ? (participants.length / event.capacity) * 100 : 0
    }
  }

  const getRecentActivity = () => {
    const recentParticipants = participants
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    const recentAssignments = assignments
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(assignment => ({
        ...assignment,
        participant: participants.find(p => p.id === assignment.patron_entry_id),
        horse: horses.find(h => h.id === assignment.event_horse_id)
      }))

    return { recentParticipants, recentAssignments }
  }

  const joinRate = getJoinRate()
  const horseStats = getHorseAssignmentStats()
  const participantStats = getParticipantStats()
  const { recentParticipants, recentAssignments } = getRecentActivity()

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Capacity</span>
            </div>
            <div className="text-2xl font-bold">{participants.length}/{event.capacity}</div>
            <Progress value={participantStats.capacityUsed} className="h-2 mt-2" />
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(participantStats.capacityUsed)}% full
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Draw Progress</span>
            </div>
            <div className="text-2xl font-bold">{assignments.length}/{participants.length}</div>
            <Progress
              value={participants.length > 0 ? (assignments.length / participants.length) * 100 : 0}
              className="h-2 mt-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              {participants.length > 0 ? Math.round((assignments.length / participants.length) * 100) : 0}% assigned
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">Horse Pool</span>
            </div>
            <div className="text-2xl font-bold">{horseStats.available}/{horseStats.total}</div>
            <Progress
              value={horseStats.total > 0 ? (horseStats.available / horseStats.total) * 100 : 0}
              className="h-2 mt-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              {horseStats.scratched} scratched
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">Time to Race</span>
            </div>
            <div className="text-sm font-bold">
              {formatEventDate(event.starts_at)}
            </div>
            <Badge variant="outline" className="mt-2 capitalize">
              {event.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participant Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Participant Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{participantStats.total}</div>
                <div className="text-xs text-blue-600">Total Participants</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{participantStats.assigned}</div>
                <div className="text-xs text-green-600">Assigned</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center space-x-2">
                  <Hash className="w-4 h-4" />
                  <span>Email provided</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{participantStats.withEmail}</span>
                  <span className="text-gray-500">
                    ({Math.round((participantStats.withEmail / participantStats.total) * 100)}%)
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center space-x-2">
                  <Hash className="w-4 h-4" />
                  <span>Phone provided</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{participantStats.withPhone}</span>
                  <span className="text-gray-500">
                    ({Math.round((participantStats.withPhone / participantStats.total) * 100)}%)
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center space-x-2">
                  <Hash className="w-4 h-4" />
                  <span>Marketing consent</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{participantStats.withConsent}</span>
                  <span className="text-gray-500">
                    ({Math.round((participantStats.withConsent / participantStats.total) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horse Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Horse Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{horseStats.total}</div>
                <div className="text-xs text-purple-600">Total Horses</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{horseStats.assigned}</div>
                <div className="text-xs text-green-600">Assigned</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span>Available for assignment</span>
                <span className="font-medium">{horseStats.unassigned}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span>Scratched horses</span>
                <span className="font-medium">{horseStats.scratched}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span>Assignment rate</span>
                <span className="font-medium">{Math.round(horseStats.assignmentRate)}%</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Assignment Progress</div>
              <Progress value={horseStats.assignmentRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Recent Joins</span>
            </CardTitle>
            <CardDescription>
              Latest participants to join the event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentParticipants.length > 0 ? (
                recentParticipants.map((participant, index) => (
                  <div key={participant.id} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium">{participant.display_name}</div>
                      <div className="text-gray-500 text-xs">{participant.join_code}</div>
                    </div>
                    <div className="text-right text-gray-500 text-xs">
                      <div>{formatTime(participant.created_at)}</div>
                      <div>#{index + 1} to join</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No participants yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Recent Assignments</span>
            </CardTitle>
            <CardDescription>
              Latest horse assignments made
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAssignments.length > 0 ? (
                recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium">{assignment.participant?.display_name}</div>
                      <div className="text-gray-500 text-xs">
                        #{assignment.horse?.number} {assignment.horse?.name}
                      </div>
                    </div>
                    <div className="text-right text-gray-500 text-xs">
                      <div>{formatTime(assignment.created_at)}</div>
                      <Badge variant="secondary" className="text-xs">
                        Assigned
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No assignments yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Join Rate Chart */}
      {joinRate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Join Activity</span>
            </CardTitle>
            <CardDescription>
              Participant joins over time (last 10 time periods)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {joinRate.map(({ time, count }) => {
                const maxCount = Math.max(...joinRate.map(r => r.count))
                const percentage = (count / maxCount) * 100

                return (
                  <div key={time} className="flex items-center space-x-3">
                    <div className="w-12 text-xs text-gray-500">{time}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                          <div
                            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}