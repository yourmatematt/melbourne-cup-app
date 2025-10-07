'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog'
import {
  Shuffle,
  Play,
  RotateCcw,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Trophy,
  Dice6,
  History,
  Undo2
} from 'lucide-react'
import { useDrawApi, useDrawState, drawValidation } from '@/hooks/use-draw-api'

interface DrawManagerProps {
  event: any
  participants: any[]
  horses: any[]
  onDrawCompleted?: () => void
  onDrawUndone?: () => void
}

export function DrawManager({
  event,
  participants,
  horses,
  onDrawCompleted,
  onDrawUndone
}: DrawManagerProps) {
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)
  const [showUndoDialog, setShowUndoDialog] = useState(false)
  const [customSeed, setCustomSeed] = useState('')
  const [undoCount, setUndoCount] = useState<number | undefined>()
  const [undoReason, setUndoReason] = useState('')
  const [dryRunResult, setDryRunResult] = useState<any>(null)
  const [showDryRunDialog, setShowDryRunDialog] = useState(false)

  const {
    assignments,
    hasDrawn,
    isLoading,
    error,
    refreshDrawState,
    subscribeToDrawUpdates,
    drawApi
  } = useDrawState(event.id)

  // Refresh state on mount and subscribe to updates
  useEffect(() => {
    refreshDrawState()
    const unsubscribe = subscribeToDrawUpdates()
    return unsubscribe
  }, [refreshDrawState, subscribeToDrawUpdates])

  // Calculate statistics
  const availableHorses = horses.filter(h => !h.is_scratched)
  const scratchedHorses = horses.filter(h => h.is_scratched)
  const canExecuteDraw = participants.length > 0 && availableHorses.length > 0 && event.status === 'lobby'

  const handleExecuteDraw = async () => {
    const result = await drawApi.executeDraw({
      seed: customSeed || undefined,
      skipScratched: true,
      dryRun: false
    })

    if (result.success) {
      setShowExecuteDialog(false)
      setCustomSeed('')
      onDrawCompleted?.()
    }
  }

  const handleDryRun = async () => {
    const result = await drawApi.dryRunDraw({
      seed: customSeed || undefined,
      skipScratched: true
    })

    if (result.success) {
      setDryRunResult(result)
      setShowDryRunDialog(true)
    }
  }

  const handleUndoDraw = async () => {
    const result = await drawApi.undoDraw({
      count: undoCount,
      reason: undoReason || undefined
    })

    if (result.success) {
      setShowUndoDialog(false)
      setUndoCount(undefined)
      setUndoReason('')
      onDrawUndone?.()
    }
  }

  const generateRandomSeed = () => {
    setCustomSeed(drawValidation.generateSecureSeed())
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Shuffle className="w-6 h-6 text-blue-500" />
            </motion.div>
            <span className="text-gray-600">Loading draw status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Draw Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Dice6 className="w-5 h-5" />
            <span>Draw Management</span>
          </CardTitle>
          <CardDescription>
            {hasDrawn
              ? 'The draw has been executed. Manage assignments below.'
              : 'Execute a random draw to assign participants to horses.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{participants.length}</div>
              <div className="text-sm text-gray-500">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{availableHorses.length}</div>
              <div className="text-sm text-gray-500">Available Horses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{assignments.length}</div>
              <div className="text-sm text-gray-500">Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{scratchedHorses.length}</div>
              <div className="text-sm text-gray-500">Scratched</div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!canExecuteDraw && !hasDrawn && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {participants.length === 0 && 'No participants registered. '}
                {availableHorses.length === 0 && 'No available horses. '}
                {event.status !== 'lobby' && 'Event must be in lobby state. '}
                Cannot execute draw yet.
              </AlertDescription>
            </Alert>
          )}

          {hasDrawn && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Draw completed successfully! {assignments.length} assignments created.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!hasDrawn && canExecuteDraw && (
              <>
                <Button
                  onClick={() => setShowExecuteDialog(true)}
                  disabled={drawApi.isExecuting}
                  className="flex items-center space-x-2"
                >
                  {drawApi.isExecuting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Shuffle className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>{drawApi.isExecuting ? 'Executing...' : 'Execute Draw'}</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDryRun}
                  disabled={drawApi.isExecuting}
                  className="flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Draw</span>
                </Button>
              </>
            )}

            {hasDrawn && (
              <Button
                variant="destructive"
                onClick={() => setShowUndoDialog(true)}
                disabled={drawApi.isUndoing}
                className="flex items-center space-x-2"
              >
                {drawApi.isUndoing ? (
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Undo2 className="w-4 h-4" />
                )}
                <span>{drawApi.isUndoing ? 'Undoing...' : 'Undo Draw'}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Results */}
      {hasDrawn && assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Draw Results</span>
            </CardTitle>
            <CardDescription>
              Assignment results from the random draw
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {assignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="font-mono">
                      #{assignment.draw_order}
                    </Badge>
                    <div>
                      <div className="font-medium">{assignment.patron_entry.participant_name}</div>
                      {assignment.patron_entry.email && (
                        <div className="text-sm text-gray-500">{assignment.patron_entry.email}</div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">
                      Horse #{assignment.event_horse.number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {assignment.event_horse.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {assignment.event_horse.jockey}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execute Draw Dialog */}
      <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execute Random Draw</DialogTitle>
            <DialogDescription>
              This will randomly assign all participants to horses. This action cannot be easily undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seed">Custom Seed (Optional)</Label>
              <div className="flex space-x-2">
                <Input
                  id="seed"
                  value={customSeed}
                  onChange={(e) => setCustomSeed(e.target.value)}
                  placeholder="Leave empty for random"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={generateRandomSeed}
                  className="shrink-0"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Use a custom seed for reproducible results (useful for auditing)
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Participants:</span>
                <span className="font-medium">{participants.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available Horses:</span>
                <span className="font-medium">{availableHorses.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Assignments to Create:</span>
                <span className="font-medium">{participants.length}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteDraw} disabled={drawApi.isExecuting}>
              {drawApi.isExecuting ? 'Executing...' : 'Execute Draw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dry Run Results Dialog */}
      <Dialog open={showDryRunDialog} onOpenChange={setShowDryRunDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Draw Preview</DialogTitle>
            <DialogDescription>
              This is how the draw would look. No changes have been made yet.
            </DialogDescription>
          </DialogHeader>

          {dryRunResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Participants:</Label>
                  <div className="font-medium">{dryRunResult.stats?.totalParticipants}</div>
                </div>
                <div>
                  <Label>Assignments:</Label>
                  <div className="font-medium">{dryRunResult.stats?.assignmentsCreated}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dryRunResult.assignments?.slice(0, 10).map((assignment: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">#{assignment.draw_order}</Badge>
                      <span>{assignment.patron_entry.participant_name}</span>
                    </div>
                    <div className="text-right text-sm">
                      <div>Horse #{assignment.event_horse.number}</div>
                      <div className="text-gray-500">{assignment.event_horse.name}</div>
                    </div>
                  </div>
                ))}
                {(dryRunResult.assignments?.length || 0) > 10 && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    ... and {(dryRunResult.assignments?.length || 0) - 10} more assignments
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDryRunDialog(false)}>
              Close Preview
            </Button>
            <Button onClick={() => {
              setShowDryRunDialog(false)
              setShowExecuteDialog(true)
            }}>
              Execute This Draw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo Draw Dialog */}
      <AlertDialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Draw Assignments</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove draw assignments. Participants will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="undoCount">Number to Undo (Optional)</Label>
              <Input
                id="undoCount"
                type="number"
                min="1"
                max={assignments.length}
                value={undoCount || ''}
                onChange={(e) => setUndoCount(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={`All ${assignments.length} assignments`}
              />
              <p className="text-xs text-gray-500">
                Leave empty to undo all assignments, or specify a number to undo the last N assignments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="undoReason">Reason for Undo (Optional)</Label>
              <Textarea
                id="undoReason"
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                placeholder="Explain why the draw is being undone..."
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUndoDraw}
              disabled={drawApi.isUndoing}
              className="bg-red-600 hover:bg-red-700"
            >
              {drawApi.isUndoing ? 'Undoing...' : 'Undo Draw'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}