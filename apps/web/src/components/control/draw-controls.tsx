'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shuffle,
  Undo2,
  UserX,
  Crown,
  Trophy,
  Users,
  AlertCircle,
  Zap,
  Target
} from 'lucide-react'

interface DrawControlsProps {
  event: any
  participants: any[]
  assignments: any[]
  horses: any[]
  unassignedParticipants: any[]
  availableHorses: any[]
  onDataChange: () => void
}

export function DrawControls({
  event,
  participants,
  assignments,
  horses,
  unassignedParticipants,
  availableHorses,
  onDataChange
}: DrawControlsProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [showManualAssign, setShowManualAssign] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<string>('')
  const [selectedHorse, setSelectedHorse] = useState<string>('')
  const [showWinnerDialog, setShowWinnerDialog] = useState(false)
  const [selectedWinnerAssignment, setSelectedWinnerAssignment] = useState<string>('')
  const supabase = createClient()

  const canDraw = unassignedParticipants.length > 0 && availableHorses.length > 0
  const lastAssignment = assignments.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]

  const handleRandomDraw = async () => {
    if (!canDraw) return

    setIsDrawing(true)
    try {
      console.log('🎯 Draw Next: Starting single draw via API...')

      const response = await fetch(`/api/events/${event.id}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drawType: 'single',
          skipScratched: true
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to perform single draw')
      }

      console.log('✅ Draw Next: Single assignment created successfully', data.stats)
      onDataChange()
    } catch (error) {
      console.error('❌ Draw Next: Error performing single draw:', error)
      alert(`Draw failed: ${error.message}`)
    } finally {
      setIsDrawing(false)
    }
  }

  const handleDrawAll = async () => {
    if (!canDraw) return

    setIsDrawing(true)
    try {
      console.log('🎲 Draw All: Starting full draw via API...')

      const response = await fetch(`/api/events/${event.id}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drawType: 'all',
          skipScratched: true
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to perform full draw')
      }

      console.log('✅ Draw All: Full draw completed successfully', data.stats)
      onDataChange()
    } catch (error) {
      console.error('❌ Draw All: Error performing full draw:', error)
      alert(`Draw failed: ${error.message}`)
    } finally {
      setIsDrawing(false)
    }
  }

  const handleClearAllAssignments = async () => {
    setIsDrawing(true)
    try {
      // Delete all assignments for this event
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('event_id', event.id)

      if (error) throw error

      onDataChange()
    } catch (error) {
      console.error('Error clearing assignments:', error)
      alert(`Failed to clear assignments: ${error.message}`)
    } finally {
      setIsDrawing(false)
    }
  }

  const handleUndoAssignment = async () => {
    if (!lastAssignment) return

    setIsUndoing(true)
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', lastAssignment.id)

      if (error) throw error

      onDataChange()
    } catch (error) {
      console.error('Error undoing assignment:', error)
    } finally {
      setIsUndoing(false)
    }
  }

  const handleManualAssignment = async () => {
    if (!selectedParticipant || !selectedHorse) return

    setIsDrawing(true)
    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          event_id: event.id,
          patron_entry_id: selectedParticipant,
          event_horse_id: selectedHorse
        })

      if (error) throw error

      setSelectedParticipant('')
      setSelectedHorse('')
      setShowManualAssign(false)
      onDataChange()
    } catch (error) {
      console.error('Error creating manual assignment:', error)
    } finally {
      setIsDrawing(false)
    }
  }

  const handleMarkWinner = async () => {
    if (!selectedWinnerAssignment) return

    try {
      const assignment = assignments.find(a => a.id === selectedWinnerAssignment)
      if (!assignment) return

      const { error } = await supabase
        .from('winners')
        .insert({
          event_id: event.id,
          assignment_id: selectedWinnerAssignment,
          position: 1,
          prize_amount: event.prize_pool || 0
        })

      if (error) throw error

      setSelectedWinnerAssignment('')
      setShowWinnerDialog(false)
      onDataChange()
    } catch (error) {
      console.error('Error marking winner:', error)
    }
  }

  const getParticipantForAssignment = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId)
    return assignment ? participants.find(p => p.id === assignment.patron_entry_id) : null
  }

  const getHorseForAssignment = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId)
    return assignment ? horses.find(h => h.id === assignment.event_horse_id) : null
  }

  return (
    <div className="space-y-6">
      {/* Draw Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shuffle className="w-5 h-5" />
            <span>Draw Status</span>
          </CardTitle>
          <CardDescription>
            Manage horse assignments for the event
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Draw Progress</span>
              <span>{assignments.length}/{participants.length} complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(assignments.length / participants.length) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draw Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Draw Controls</CardTitle>
          <CardDescription>
            Perform random assignments or manage existing ones
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Random Draw Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleRandomDraw}
              disabled={!canDraw || isDrawing}
              className="h-16 flex flex-col space-y-1"
            >
              <Zap className="w-5 h-5" />
              <span>{isDrawing ? 'Drawing...' : 'Draw Next'}</span>
              <span className="text-xs opacity-75">Random single assignment</span>
            </Button>

            <Button
              onClick={handleDrawAll}
              disabled={!canDraw || isDrawing}
              variant="secondary"
              className="h-16 flex flex-col space-y-1"
            >
              <Shuffle className="w-5 h-5" />
              <span>{isDrawing ? 'Drawing...' : 'Draw All'}</span>
              <span className="text-xs opacity-75">Assign all remaining</span>
            </Button>
          </div>

          {!canDraw && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {unassignedParticipants.length === 0
                    ? 'All participants have been assigned horses'
                    : 'No horses available for assignment'
                  }
                </span>
              </div>
              {assignments.length > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Trophy className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600">
                    Draw complete! You can clear all assignments to run a new draw.
                  </span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Management Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Undo Last Assignment */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!lastAssignment || isUndoing}
                  className="flex items-center space-x-2"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>Undo Last</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Undo Last Assignment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to undo the last horse assignment? This will remove the assignment and make the horse available again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUndoAssignment}>
                    Undo Assignment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Manual Assignment */}
            <Dialog open={showManualAssign} onOpenChange={setShowManualAssign}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={unassignedParticipants.length === 0 || availableHorses.length === 0}
                  className="flex items-center space-x-2"
                >
                  <Target className="w-4 h-4" />
                  <span>Manual Assign</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manual Assignment</DialogTitle>
                  <DialogDescription>
                    Manually assign a specific horse to a participant
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Participant</label>
                    <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose participant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedParticipants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Select Horse</label>
                    <Select value={selectedHorse} onValueChange={setSelectedHorse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose horse..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableHorses.map((horse) => (
                          <SelectItem key={horse.id} value={horse.id}>
                            #{horse.number} {horse.name}
                            {horse.jockey && ` (${horse.jockey})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowManualAssign(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleManualAssignment}
                    disabled={!selectedParticipant || !selectedHorse || isDrawing}
                  >
                    {isDrawing ? 'Assigning...' : 'Assign Horse'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Clear All Assignments */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={assignments.length === 0 || isDrawing}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                >
                  <UserX className="w-4 h-4" />
                  <span>Clear All</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Assignments</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to clear all horse assignments? This will remove all current assignments and allow you to run a new draw.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAllAssignments}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Clear All Assignments
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Mark Winner */}
            <Dialog open={showWinnerDialog} onOpenChange={setShowWinnerDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={assignments.length === 0}
                  className="flex items-center space-x-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>Mark Winner</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark Race Winner</DialogTitle>
                  <DialogDescription>
                    Select the participant who owns the winning horse
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Winner</label>
                    <Select value={selectedWinnerAssignment} onValueChange={setSelectedWinnerAssignment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose winner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((assignment) => {
                          const participant = getParticipantForAssignment(assignment.id)
                          const horse = getHorseForAssignment(assignment.id)
                          return (
                            <SelectItem key={assignment.id} value={assignment.id}>
                              {participant?.display_name} - #{horse?.number} {horse?.name}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowWinnerDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleMarkWinner}
                    disabled={!selectedWinnerAssignment}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Mark as Winner
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Current Assignments ({assignments.length})</span>
            </CardTitle>
            <CardDescription>
              Recent horse assignments made during the draw
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {assignments
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((assignment) => {
                  const participant = getParticipantForAssignment(assignment.id)
                  const horse = getHorseForAssignment(assignment.id)

                  return (
                    <div
                      key={assignment.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{participant?.display_name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(assignment.created_at).toLocaleTimeString('en-AU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-medium">
                          #{horse?.number} {horse?.name}
                        </div>
                        {horse?.jockey && (
                          <div className="text-sm text-gray-500">
                            {horse.jockey}
                          </div>
                        )}
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