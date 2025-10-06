import { createClient } from '@/lib/supabase/client'
import { AppError, ConflictError, ValidationError, NotFoundError } from '@/lib/middleware/error-handler'
import { validateInput, qrCodeSchema, joinCodeLookupSchema } from '@/lib/validations'
import crypto from 'crypto'

interface JoinValidationResult {
  success: boolean
  event?: any
  existingParticipant?: any
  canJoin: boolean
  reason?: string
  error?: string
}

interface QRCodeValidationResult {
  success: boolean
  event?: any
  isValid: boolean
  isExpired: boolean
  error?: string
}

export class JoinValidationService {
  private supabase = createClient()

  /**
   * Validate a QR code and return event information
   */
  async validateQRCode(qrData: string): Promise<QRCodeValidationResult> {
    try {
      // Parse QR code data
      let qrPayload: any
      try {
        qrPayload = JSON.parse(qrData)
      } catch {
        return {
          success: false,
          isValid: false,
          isExpired: false,
          error: 'Invalid QR code format'
        }
      }

      // Validate QR code structure
      const validation = validateInput(qrCodeSchema, qrPayload)
      if (!validation.success) {
        return {
          success: false,
          isValid: false,
          isExpired: false,
          error: 'Invalid QR code data'
        }
      }

      const { eventId, timestamp, signature } = validation.data!

      // Verify QR code signature (implement your signature verification logic)
      const isValidSignature = await this.verifyQRSignature(eventId, timestamp, signature)
      if (!isValidSignature) {
        return {
          success: false,
          isValid: false,
          isExpired: false,
          error: 'QR code signature is invalid'
        }
      }

      // Check if QR code is expired
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      const isExpired = (now - timestamp) > maxAge

      if (isExpired) {
        return {
          success: true,
          isValid: false,
          isExpired: true,
          error: 'QR code has expired'
        }
      }

      // Get event information
      const { data: event, error: eventError } = await this.supabase
        .from('events')
        .select(`
          *,
          tenants!tenant_id(name)
        `)
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        return {
          success: false,
          isValid: false,
          isExpired: false,
          error: 'Event not found or no longer available'
        }
      }

      return {
        success: true,
        event,
        isValid: true,
        isExpired: false
      }

    } catch (error) {
      console.error('QR code validation error:', error)
      return {
        success: false,
        isValid: false,
        isExpired: false,
        error: 'Failed to validate QR code'
      }
    }
  }

  /**
   * Validate join code and return participant information
   */
  async validateJoinCode(joinCode: string): Promise<JoinValidationResult> {
    try {
      // Validate join code format
      const validation = validateInput(joinCodeLookupSchema, { joinCode })
      if (!validation.success) {
        return {
          success: false,
          canJoin: false,
          error: 'Invalid join code format'
        }
      }

      const normalizedCode = validation.data!.joinCode

      // Look up participant by join code
      const { data: participant, error: participantError } = await this.supabase
        .from('patron_entries')
        .select(`
          *,
          events!event_id(
            *,
            tenants!tenant_id(name)
          )
        `)
        .eq('join_code', normalizedCode)
        .single()

      if (participantError || !participant) {
        return {
          success: false,
          canJoin: false,
          error: 'Join code not found'
        }
      }

      return {
        success: true,
        event: participant.events,
        existingParticipant: participant,
        canJoin: true
      }

    } catch (error) {
      console.error('Join code validation error:', error)
      return {
        success: false,
        canJoin: false,
        error: 'Failed to validate join code'
      }
    }
  }

  /**
   * Check if a participant can join an event
   */
  async validateJoinEligibility(eventId: string, participantData: any): Promise<JoinValidationResult> {
    try {
      // Get event information
      const { data: event, error: eventError } = await this.supabase
        .from('events')
        .select(`
          *,
          tenants!tenant_id(name)
        `)
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        return {
          success: false,
          canJoin: false,
          error: 'Event not found'
        }
      }

      // Check event status
      if (event.status !== 'lobby') {
        return {
          success: true,
          event,
          canJoin: false,
          reason: 'EVENT_CLOSED',
          error: 'This event is no longer accepting participants'
        }
      }

      // Check event capacity
      const { count: currentParticipants } = await this.supabase
        .from('patron_entries')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      if (currentParticipants && currentParticipants >= event.capacity) {
        return {
          success: true,
          event,
          canJoin: false,
          reason: 'CAPACITY_EXCEEDED',
          error: 'This event is at capacity'
        }
      }

      // Check for duplicate entries (by email or phone)
      const duplicateCheck = await this.checkDuplicateParticipant(eventId, participantData)
      if (duplicateCheck.isDuplicate) {
        return {
          success: true,
          event,
          existingParticipant: duplicateCheck.existingParticipant,
          canJoin: false,
          reason: 'DUPLICATE_ENTRY',
          error: duplicateCheck.reason
        }
      }

      // Check event timing
      if (event.starts_at) {
        const eventStart = new Date(event.starts_at)
        const now = new Date()

        // Don't allow joins too close to start time (e.g., 10 minutes)
        const timeUntilStart = eventStart.getTime() - now.getTime()
        const minimumTime = 10 * 60 * 1000 // 10 minutes

        if (timeUntilStart < minimumTime && timeUntilStart > 0) {
          return {
            success: true,
            event,
            canJoin: false,
            reason: 'TOO_LATE',
            error: 'Entries have closed for this event'
          }
        }

        if (now > eventStart) {
          return {
            success: true,
            event,
            canJoin: false,
            reason: 'EVENT_STARTED',
            error: 'This event has already started'
          }
        }
      }

      return {
        success: true,
        event,
        canJoin: true
      }

    } catch (error) {
      console.error('Join eligibility validation error:', error)
      return {
        success: false,
        canJoin: false,
        error: 'Failed to validate join eligibility'
      }
    }
  }

  /**
   * Check for duplicate participants
   */
  private async checkDuplicateParticipant(eventId: string, participantData: any) {
    const { email, phone, displayName } = participantData

    // Build query conditions
    const conditions: string[] = []
    if (email) conditions.push(`email.eq.${email}`)
    if (phone) conditions.push(`phone.eq.${phone}`)

    if (conditions.length === 0) {
      return { isDuplicate: false }
    }

    // Check for existing participant with same email or phone
    const { data: existingParticipants, error } = await this.supabase
      .from('patron_entries')
      .select('*')
      .eq('event_id', eventId)
      .or(conditions.join(','))

    if (error) {
      throw new AppError('Failed to check for duplicate participants')
    }

    if (existingParticipants && existingParticipants.length > 0) {
      const existingParticipant = existingParticipants[0]

      // Determine the reason for duplicate
      let reason = 'You have already joined this event'
      if (email && existingParticipant.email === email) {
        reason = `This email address (${email}) has already been used to join this event`
      } else if (phone && existingParticipant.phone === phone) {
        reason = `This phone number (${phone}) has already been used to join this event`
      }

      return {
        isDuplicate: true,
        existingParticipant,
        reason
      }
    }

    // Additional check for similar names (fuzzy matching)
    if (displayName) {
      const similarNameCheck = await this.checkSimilarNames(eventId, displayName)
      if (similarNameCheck.hasSimilar) {
        return {
          isDuplicate: true,
          existingParticipant: similarNameCheck.participant,
          reason: `A participant with a similar name (${similarNameCheck.participant.display_name}) has already joined. If this is you, please use the same contact details.`
        }
      }
    }

    return { isDuplicate: false }
  }

  /**
   * Check for similar names using fuzzy matching
   */
  private async checkSimilarNames(eventId: string, displayName: string) {
    const { data: participants, error } = await this.supabase
      .from('patron_entries')
      .select('display_name, email, phone')
      .eq('event_id', eventId)

    if (error || !participants) {
      return { hasSimilar: false }
    }

    const normalizedName = displayName.toLowerCase().trim()

    for (const participant of participants) {
      const participantName = participant.display_name.toLowerCase().trim()

      // Exact match
      if (participantName === normalizedName) {
        return {
          hasSimilar: true,
          participant
        }
      }

      // Check for very similar names (Levenshtein distance or simple checks)
      if (this.calculateSimilarity(normalizedName, participantName) > 0.85) {
        return {
          hasSimilar: true,
          participant
        }
      }
    }

    return { hasSimilar: false }
  }

  /**
   * Calculate string similarity (simplified)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Verify QR code signature
   */
  private async verifyQRSignature(eventId: string, timestamp: number, signature: string): Promise<boolean> {
    try {
      // Implementation depends on your signing strategy
      // This is a simplified example using HMAC
      const secret = process.env.QR_CODE_SECRET || 'default-secret'
      const payload = `${eventId}:${timestamp}`

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      return signature === expectedSignature
    } catch (error) {
      console.error('QR signature verification error:', error)
      return false
    }
  }

  /**
   * Generate a unique join code
   */
  async generateUniqueJoinCode(): Promise<string> {
    const maxAttempts = 10
    let attempts = 0

    while (attempts < maxAttempts) {
      const joinCode = this.generateJoinCode()

      // Check if code already exists
      const { data: existing } = await this.supabase
        .from('patron_entries')
        .select('join_code')
        .eq('join_code', joinCode)
        .single()

      if (!existing) {
        return joinCode
      }

      attempts++
    }

    throw new AppError('Failed to generate unique join code')
  }

  /**
   * Generate a random join code
   */
  private generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''

    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return result
  }

  /**
   * Log join attempt for analytics
   */
  async logJoinAttempt(eventId: string, attempt: {
    success: boolean
    reason?: string
    participantData?: any
    source?: 'qr' | 'link' | 'manual'
    userAgent?: string
    ipAddress?: string
  }) {
    try {
      await this.supabase
        .from('join_attempts')
        .insert({
          event_id: eventId,
          success: attempt.success,
          failure_reason: attempt.reason,
          source: attempt.source || 'unknown',
          user_agent: attempt.userAgent,
          ip_address: attempt.ipAddress,
          participant_data: attempt.participantData ? {
            has_email: !!attempt.participantData.email,
            has_phone: !!attempt.participantData.phone,
            consent: attempt.participantData.marketingConsent
          } : null,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      // Don't throw - this is just for analytics
      console.error('Failed to log join attempt:', error)
    }
  }
}

// Singleton instance
export const joinValidationService = new JoinValidationService()