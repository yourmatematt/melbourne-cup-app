import { createClient } from '@/lib/supabase/client'
import { AppError, ConflictError, NotFoundError } from '@/lib/middleware/error-handler'

interface HorseReassignmentResult {
  success: boolean
  scratchedHorse: any
  affectedAssignments: any[]
  reassignments: any[]
  redistributionMap: Record<string, string[]> // horse_id -> participant_ids
  error?: string
}

interface ScratchHorseOptions {
  reason?: string
  autoReassign?: boolean
  notifyParticipants?: boolean
  preserveDrawOrder?: boolean
}

export class HorseManagementService {
  private supabase = createClient()

  /**
   * Scratch a horse and optionally reassign participants
   */
  async scratchHorse(
    eventId: string,
    horseNumber: number,
    options: ScratchHorseOptions = {}
  ): Promise<HorseReassignmentResult> {
    const {
      reason = 'Scratched by stewards',
      autoReassign = true,
      notifyParticipants = true,
      preserveDrawOrder = true
    } = options

    try {
      // Start transaction
      const { data: horse, error: horseError } = await this.supabase
        .from('event_horses')
        .select('*')
        .eq('event_id', eventId)
        .eq('number', horseNumber)
        .single()

      if (horseError || !horse) {
        throw new NotFoundError(`Horse #${horseNumber}`)
      }

      if (horse.is_scratched) {
        throw new ConflictError(`Horse #${horseNumber} is already scratched`)
      }

      // Get affected assignments
      const { data: affectedAssignments, error: assignmentsError } = await this.supabase
        .from('assignments')
        .select(`
          *,
          patron_entries!patron_entry_id(*),
          event_horses!event_horse_id(*)
        `)
        .eq('event_horse_id', horse.id)
        .is('deleted_at', null)

      if (assignmentsError) {
        throw new AppError('Failed to fetch affected assignments')
      }

      // Mark horse as scratched
      const { error: scratchError } = await this.supabase
        .from('event_horses')
        .update({
          is_scratched: true,
          scratched_at: new Date().toISOString(),
          scratch_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', horse.id)

      if (scratchError) {
        throw new AppError('Failed to scratch horse')
      }

      let reassignments: any[] = []
      let redistributionMap: Record<string, string[]> = {}

      if (autoReassign && affectedAssignments && affectedAssignments.length > 0) {
        const reassignmentResult = await this.reassignParticipants(
          eventId,
          affectedAssignments,
          preserveDrawOrder
        )

        reassignments = reassignmentResult.reassignments
        redistributionMap = reassignmentResult.redistributionMap
      }

      // Create audit log
      await this.createAuditLog(eventId, 'horse_scratched', {
        horse_number: horseNumber,
        horse_name: horse.name,
        reason,
        affected_participants: affectedAssignments?.length || 0,
        auto_reassigned: autoReassign,
        reassignments_created: reassignments.length
      })

      // Send notifications if requested
      if (notifyParticipants && affectedAssignments) {
        await this.notifyAffectedParticipants(
          affectedAssignments,
          horse,
          reason,
          reassignments
        )
      }

      return {
        success: true,
        scratchedHorse: horse,
        affectedAssignments: affectedAssignments || [],
        reassignments,
        redistributionMap
      }

    } catch (error) {
      console.error('Error scratching horse:', error)
      return {
        success: false,
        scratchedHorse: null,
        affectedAssignments: [],
        reassignments: [],
        redistributionMap: {},
        error: error instanceof Error ? error.message : 'Failed to scratch horse'
      }
    }
  }

  /**
   * Reassign participants to available horses
   */
  private async reassignParticipants(
    eventId: string,
    affectedAssignments: any[],
    preserveDrawOrder: boolean = true
  ): Promise<{
    reassignments: any[]
    redistributionMap: Record<string, string[]>
  }> {
    // Get available horses (not scratched)
    const { data: availableHorses, error: horsesError } = await this.supabase
      .from('event_horses')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_scratched', false)
      .order('number', { ascending: true })

    if (horsesError || !availableHorses || availableHorses.length === 0) {
      throw new AppError('No available horses for reassignment')
    }

    // Get current assignment counts per horse
    const { data: currentAssignments } = await this.supabase
      .from('assignments')
      .select('event_horse_id')
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .in('event_horse_id', availableHorses.map(h => h.id))

    const horseCounts = new Map<string, number>()
    availableHorses.forEach(horse => {
      const count = currentAssignments?.filter(a => a.event_horse_id === horse.id).length || 0
      horseCounts.set(horse.id, count)
    })

    // Sort horses by current assignment count (least assignments first)
    const sortedHorses = availableHorses.sort((a, b) => {
      const countA = horseCounts.get(a.id) || 0
      const countB = horseCounts.get(b.id) || 0
      return countA - countB
    })

    const reassignments: any[] = []
    const redistributionMap: Record<string, string[]> = {}
    let horseIndex = 0

    // Reassign participants using round-robin to maintain fairness
    for (const assignment of affectedAssignments) {
      const newHorse = sortedHorses[horseIndex % sortedHorses.length]

      // Delete old assignment (soft delete)
      await this.supabase
        .from('assignments')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id)

      // Create new assignment
      const newDrawOrder = preserveDrawOrder ? assignment.draw_order : Date.now()

      const { data: newAssignment, error: reassignError } = await this.supabase
        .from('assignments')
        .insert({
          event_id: eventId,
          patron_entry_id: assignment.patron_entry_id,
          event_horse_id: newHorse.id,
          draw_order: newDrawOrder,
          reassigned_from: assignment.event_horse_id,
          reassignment_reason: 'horse_scratched',
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          patron_entries!patron_entry_id(*),
          event_horses!event_horse_id(*)
        `)
        .single()

      if (reassignError) {
        console.error('Failed to create reassignment:', reassignError)
        continue
      }

      reassignments.push(newAssignment)

      // Update redistribution map
      if (!redistributionMap[newHorse.id]) {
        redistributionMap[newHorse.id] = []
      }
      redistributionMap[newHorse.id].push(assignment.patron_entry_id)

      // Update horse count for next iteration
      horseCounts.set(newHorse.id, (horseCounts.get(newHorse.id) || 0) + 1)
      horseIndex++
    }

    return { reassignments, redistributionMap }
  }

  /**
   * Get scratch history for an event
   */
  async getScratchHistory(eventId: string) {
    const { data, error } = await this.supabase
      .from('event_horses')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_scratched', true)
      .order('scratched_at', { ascending: false })

    if (error) {
      throw new AppError('Failed to fetch scratch history')
    }

    return data || []
  }

  /**
   * Get reassignment history for an event
   */
  async getReassignmentHistory(eventId: string) {
    const { data, error } = await this.supabase
      .from('assignments')
      .select(`
        *,
        patron_entries!patron_entry_id(display_name),
        event_horses!event_horse_id(number, name),
        event_horses!reassigned_from(number, name)
      `)
      .eq('event_id', eventId)
      .not('reassigned_from', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new AppError('Failed to fetch reassignment history')
    }

    return data || []
  }

  /**
   * Restore a scratched horse (if no race has started)
   */
  async restoreHorse(eventId: string, horseNumber: number) {
    const { data: horse, error: horseError } = await this.supabase
      .from('event_horses')
      .select('*')
      .eq('event_id', eventId)
      .eq('number', horseNumber)
      .single()

    if (horseError || !horse) {
      throw new NotFoundError(`Horse #${horseNumber}`)
    }

    if (!horse.is_scratched) {
      throw new ConflictError(`Horse #${horseNumber} is not scratched`)
    }

    // Check if race has started (implement your race status logic)
    const { data: event } = await this.supabase
      .from('events')
      .select('status')
      .eq('id', eventId)
      .single()

    if (event?.status === 'complete') {
      throw new ConflictError('Cannot restore horse after race completion')
    }

    // Restore horse
    const { error: restoreError } = await this.supabase
      .from('event_horses')
      .update({
        is_scratched: false,
        scratched_at: null,
        scratch_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', horse.id)

    if (restoreError) {
      throw new AppError('Failed to restore horse')
    }

    // Create audit log
    await this.createAuditLog(eventId, 'horse_restored', {
      horse_number: horseNumber,
      horse_name: horse.name
    })

    return horse
  }

  /**
   * Bulk scratch multiple horses
   */
  async bulkScratchHorses(
    eventId: string,
    horseNumbers: number[],
    reason: string = 'Bulk scratching'
  ) {
    const results: HorseReassignmentResult[] = []

    for (const horseNumber of horseNumbers) {
      const result = await this.scratchHorse(eventId, horseNumber, {
        reason,
        autoReassign: true,
        notifyParticipants: true
      })
      results.push(result)
    }

    return results
  }

  /**
   * Get available horses for reassignment
   */
  async getAvailableHorses(eventId: string) {
    const { data, error } = await this.supabase
      .from('event_horses')
      .select(`
        *,
        assignments:assignments!inner(count)
      `)
      .eq('event_id', eventId)
      .eq('is_scratched', false)
      .order('number', { ascending: true })

    if (error) {
      throw new AppError('Failed to fetch available horses')
    }

    return data || []
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(eventId: string, action: string, details: any) {
    await this.supabase
      .from('audit_logs')
      .insert({
        event_id: eventId,
        action,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          service: 'horse_management'
        }
      })
  }

  /**
   * Send notifications to affected participants
   */
  private async notifyAffectedParticipants(
    affectedAssignments: any[],
    scratchedHorse: any,
    reason: string,
    reassignments: any[]
  ) {
    // Implementation would depend on your notification system
    // This could send emails, SMS, push notifications, etc.

    for (const assignment of affectedAssignments) {
      const participant = assignment.patron_entries
      const newAssignment = reassignments.find(r => r.patron_entry_id === participant.id)

      const notificationData = {
        participant_id: participant.id,
        event_id: assignment.event_id,
        type: 'horse_scratched',
        title: `Horse #${scratchedHorse.number} Scratched`,
        message: newAssignment
          ? `Your horse #${scratchedHorse.number} (${scratchedHorse.name}) has been scratched. You've been reassigned to Horse #${newAssignment.event_horses.number} (${newAssignment.event_horses.name}).`
          : `Your horse #${scratchedHorse.number} (${scratchedHorse.name}) has been scratched. Reason: ${reason}`,
        data: {
          scratched_horse: scratchedHorse,
          new_assignment: newAssignment,
          reason
        }
      }

      // Store notification in database
      await this.supabase
        .from('notifications')
        .insert(notificationData)

      // Send via external services (email, SMS, push) here
      console.log('Notification sent to participant:', participant.display_name, notificationData)
    }
  }
}

// Singleton instance
export const horseManagementService = new HorseManagementService()