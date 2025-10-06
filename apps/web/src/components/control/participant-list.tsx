'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Plus,
  Trash2,
  Trophy,
  Mail,
  Phone,
  Clock,
  Filter,
  UserPlus
} from 'lucide-react'

interface ParticipantListProps {
  event: any
  participants: any[]
  assignments: any[]
  horses: any[]
  onDataChange: () => void
}

export function ParticipantList({
  event,
  participants,
  assignments,
  horses,
  onDataChange
}: ParticipantListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAssignedOnly, setShowAssignedOnly] = useState(false)
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newParticipant, setNewParticipant] = useState({
    displayName: '',
    email: '',
    phone: '',
    marketingConsent: false
  })

  const supabase = createClient()

  // Filter participants based on search and filters
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (participant.email && participant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (participant.join_code && participant.join_code.toLowerCase().includes(searchTerm.toLowerCase()))

    const assignment = assignments.find(a => a.patron_entry_id === participant.id)
    const isAssigned = !!assignment

    if (showAssignedOnly && !isAssigned) return false
    if (showUnassignedOnly && isAssigned) return false

    return matchesSearch
  })

  const handleAddParticipant = async () => {
    if (!newParticipant.displayName.trim()) return

    setIsLoading(true)
    try {
      // Check if event is full
      if (participants.length >= event.capacity) {
        alert(`Event is full! Maximum capacity is ${event.capacity} participants.`)
        return
      }

      // Validate email format if provided
      const email = newParticipant.email.trim()
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.')
        return
      }

      // Check for duplicate email if provided
      if (email) {
        const existingParticipant = participants.find(p =>
          p.email?.toLowerCase() === email.toLowerCase()
        )
        if (existingParticipant) {
          alert(`A participant with email "${email}" already exists in this event.`)
          return
        }
      }

      // Generate join code
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { error } = await supabase
        .from('patron_entries')
        .insert({
          event_id: event.id,
          display_name: newParticipant.displayName.trim(),
          email: email || null,
          phone: newParticipant.phone.trim() || null,
          consent: newParticipant.marketingConsent,
          join_code: joinCode
        })

      if (error) {
        if (error.code === '23505') {
          alert('A participant with this information already exists.')
        } else {
          alert(`Failed to add participant: ${error.message}`)
        }
        return
      }

      setNewParticipant({
        displayName: '',
        email: '',
        phone: '',
        marketingConsent: false
      })
      setShowManualAdd(false)
      onDataChange()
    } catch (error) {
      console.error('Error adding participant:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteParticipant = async (participantId: string) => {
    setIsLoading(true)
    try {
      // Delete assignments first
      await supabase
        .from('assignments')
        .delete()
        .eq('patron_entry_id', participantId)

      // Delete participant
      const { error } = await supabase
        .from('patron_entries')
        .delete()
        .eq('id', participantId)

      if (error) throw error

      onDataChange()
    } catch (error) {
      console.error('Error deleting participant:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAssignmentForParticipant = (participantId: string) => {
    return assignments.find(a => a.patron_entry_id === participantId)
  }

  const isEventFull = participants.length >= event.capacity

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Participants ({participants.length})</CardTitle>
              <CardDescription>
                Manage event participants and view assignments
              </CardDescription>
            </div>

            <Dialog open={showManualAdd} onOpenChange={setShowManualAdd}>
              <DialogTrigger asChild>
                <Button disabled={isEventFull}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isEventFull ? 'Event Full' : 'Add Participant'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Participant Manually</DialogTitle>
                  <DialogDescription>
                    Add a participant who couldn't join through the normal process
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="displayName">Name *</Label>
                    <Input
                      id="displayName"
                      value={newParticipant.displayName}
                      onChange={(e) => setNewParticipant(prev => ({
                        ...prev,
                        displayName: e.target.value
                      }))}
                      placeholder="Participant name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newParticipant.email}
                      onChange={(e) => setNewParticipant(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newParticipant.phone}
                      onChange={(e) => setNewParticipant(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))}
                      placeholder="0400 123 456"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="consent"
                      checked={newParticipant.marketingConsent}
                      onCheckedChange={(checked) => setNewParticipant(prev => ({
                        ...prev,
                        marketingConsent: checked as boolean
                      }))}
                    />
                    <Label htmlFor="consent" className="text-sm">
                      Marketing consent
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowManualAdd(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddParticipant}
                    disabled={!newParticipant.displayName.trim() || isLoading}
                  >
                    {isLoading ? 'Adding...' : 'Add Participant'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, or join code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assigned"
                  checked={showAssignedOnly}
                  onCheckedChange={(checked) => {
                    setShowAssignedOnly(checked as boolean)
                    if (checked) setShowUnassignedOnly(false)
                  }}
                />
                <Label htmlFor="assigned" className="text-sm">Assigned only</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unassigned"
                  checked={showUnassignedOnly}
                  onCheckedChange={(checked) => {
                    setShowUnassignedOnly(checked as boolean)
                    if (checked) setShowAssignedOnly(false)
                  }}
                />
                <Label htmlFor="unassigned" className="text-sm">Unassigned only</Label>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredParticipants.length} of {participants.length} participants
            </span>
            <div className="flex items-center space-x-4">
              <span>
                {assignments.length} assigned
              </span>
              <span>
                {participants.length - assignments.length} waiting
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participant List */}
      <div className="space-y-3">
        {filteredParticipants.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No participants match your search' : 'No participants yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredParticipants.map((participant) => {
            const assignment = getAssignmentForParticipant(participant.id)
            const horse = assignment ? horses.find(h => h.id === assignment.event_horse_id) : null

            return (
              <Card key={participant.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-medium text-lg">
                            {participant.display_name}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Joined {formatTime(participant.created_at)}</span>
                            <Badge variant="outline" className="text-xs">
                              {participant.join_code}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {participant.email && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{participant.email}</span>
                          </div>
                        )}

                        {participant.phone && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{participant.phone}</span>
                          </div>
                        )}

                        {participant.consent && (
                          <Badge variant="secondary" className="text-xs">
                            Marketing OK
                          </Badge>
                        )}
                      </div>

                      {assignment && horse && (
                        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                          <Trophy className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            #{horse.number} {horse.name}
                          </span>
                          {horse.jockey && (
                            <span className="text-xs text-green-600">
                              ({horse.jockey})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {!assignment && (
                        <Badge variant="outline">
                          Waiting
                        </Badge>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Participant</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {participant.display_name} from the event?
                              This will also remove any horse assignment.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteParticipant(participant.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}