'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AddParticipantModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  event: {
    id: string
    name: string
    capacity: number
  }
  participants: any[]
  onParticipantAdded: () => void
}

interface NewParticipant {
  displayName: string
  email: string
  phone: string
  marketingConsent: boolean
}

export function AddParticipantModal({
  isOpen,
  onOpenChange,
  event,
  participants,
  onParticipantAdded
}: AddParticipantModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [newParticipant, setNewParticipant] = useState<NewParticipant>({
    displayName: '',
    email: '',
    phone: '',
    marketingConsent: false
  })

  const supabase = createClient()
  const isEventFull = participants.length >= event.capacity

  const resetForm = () => {
    setNewParticipant({
      displayName: '',
      email: '',
      phone: '',
      marketingConsent: false
    })
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleAddParticipant = async () => {
    if (!newParticipant.displayName.trim()) {
      toast.error('Name is required')
      return
    }

    setIsLoading(true)
    try {
      // Check if event is full
      if (participants.length >= event.capacity) {
        toast.error(`Event is full! Maximum capacity is ${event.capacity} participants.`)
        return
      }

      // Validate email format if provided
      const email = newParticipant.email.trim()
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Please enter a valid email address.')
        return
      }

      // Check for duplicate email if provided
      if (email) {
        const existingParticipant = participants.find(p =>
          p.email?.toLowerCase() === email.toLowerCase()
        )
        if (existingParticipant) {
          toast.error(`A participant with email "${email}" already exists in this event.`)
          return
        }
      }

      // Generate join code
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { error } = await supabase
  .from('patron_entries')
  .insert({
    event_id: event.id,
    participant_name: newParticipant.displayName.trim(),
    email: email || null,
    phone: newParticipant.phone.trim() || null,
    marketing_consent: newParticipant.marketingConsent,
    join_code: joinCode
  } as any)

      if (error) {
        if (error.code === '23505') {
          toast.error('A participant with this information already exists.')
        } else {
          toast.error(`Failed to add participant: ${error.message}`)
        }
        return
      }

      toast.success(`${newParticipant.displayName.trim()} added successfully!`)
      resetForm()
      handleClose()
      onParticipantAdded()
    } catch (error) {
      console.error('Error adding participant:', error)
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Participant</span>
          </DialogTitle>
          <DialogDescription>
            Add a participant to "{event.name}" manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isEventFull && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">
                Event is full! ({participants.length}/{event.capacity} participants)
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="displayName">Name *</Label>
            <Input
              id="displayName"
              value={newParticipant.displayName}
              onChange={(e) => setNewParticipant(prev => ({
                ...prev,
                displayName: e.target.value
              }))}
              placeholder="John Smith"
              disabled={isLoading || isEventFull}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={newParticipant.email}
              onChange={(e) => setNewParticipant(prev => ({
                ...prev,
                email: e.target.value
              }))}
              placeholder="john@example.com"
              disabled={isLoading || isEventFull}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={newParticipant.phone}
              onChange={(e) => setNewParticipant(prev => ({
                ...prev,
                phone: e.target.value
              }))}
              placeholder="0400 123 456"
              disabled={isLoading || isEventFull}
              className="mt-1"
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="consent"
              checked={newParticipant.marketingConsent}
              onCheckedChange={(checked) => setNewParticipant(prev => ({
                ...prev,
                marketingConsent: checked as boolean
              }))}
              disabled={isLoading || isEventFull}
              className="mt-1"
            />
            <Label htmlFor="consent" className="text-sm leading-5">
              I agree to receive marketing communications from this venue
            </Label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-1">What happens next:</h4>
            <ul className="text-sm text-blue-700 space-y-0.5">
              <li>• Participant gets a unique join code</li>
              <li>• They can be assigned a horse in the draw</li>
              <li>• Contact details are stored securely</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddParticipant}
            disabled={!newParticipant.displayName.trim() || isLoading || isEventFull}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}