import { createClient } from '@/lib/supabase/client'
import { ConflictError, AppError } from '@/lib/middleware/error-handler'

interface LockOptions {
  expiresInMs?: number
  autoExtend?: boolean
  extendIntervalMs?: number
  onLockLost?: () => void
  onConflict?: (lockedBy: string, lockedAt: Date) => void
}

interface LockInfo {
  resourceId: string
  resourceType: string
  lockedBy: string
  lockedAt: Date
  expiresAt: Date
  version: number
  metadata?: any
}

interface OptimisticLockResult {
  success: boolean
  lockInfo?: LockInfo
  conflict?: {
    lockedBy: string
    lockedAt: Date
    expiresAt: Date
  }
  error?: string
}

interface VersionedResource {
  version: number
  lastModified: Date
  modifiedBy: string
}

export class OptimisticLockService {
  private supabase = createClient()
  private activeLocks = new Map<string, NodeJS.Timeout>()
  private lockExtensions = new Map<string, NodeJS.Timeout>()

  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  private getLockKey(resourceType: string, resourceId: string): string {
    return `${resourceType}:${resourceId}`
  }

  /**
   * Acquire an optimistic lock on a resource
   */
  async acquireLock(
    resourceType: string,
    resourceId: string,
    lockedBy: string,
    options: LockOptions = {}
  ): Promise<OptimisticLockResult> {
    const {
      expiresInMs = 300000, // 5 minutes default
      autoExtend = true,
      extendIntervalMs = 60000, // 1 minute
      onLockLost,
      onConflict
    } = options

    const lockKey = this.getLockKey(resourceType, resourceId)
    const lockId = this.generateLockId()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresInMs)

    try {
      // First, check for existing locks
      const { data: existingLock, error: checkError } = await this.supabase
        .from('resource_locks')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .gt('expires_at', now.toISOString())
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw new AppError('Failed to check existing locks')
      }

      if (existingLock) {
        const conflict = {
          lockedBy: existingLock.locked_by,
          lockedAt: new Date(existingLock.locked_at),
          expiresAt: new Date(existingLock.expires_at)
        }

        onConflict?.(conflict.lockedBy, conflict.lockedAt)

        return {
          success: false,
          conflict,
          error: `Resource is locked by ${conflict.lockedBy} until ${conflict.expiresAt.toLocaleString()}`
        }
      }

      // Acquire the lock
      const { data: lockData, error: lockError } = await this.supabase
        .from('resource_locks')
        .insert({
          id: lockId,
          resource_type: resourceType,
          resource_id: resourceId,
          locked_by: lockedBy,
          locked_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          version: 1,
          metadata: options
        })
        .select('*')
        .single()

      if (lockError) {
        // Check if it's a unique constraint violation (race condition)
        if (lockError.code === '23505') {
          return this.acquireLock(resourceType, resourceId, lockedBy, options)
        }
        throw new AppError('Failed to acquire lock')
      }

      const lockInfo: LockInfo = {
        resourceId,
        resourceType,
        lockedBy,
        lockedAt: now,
        expiresAt,
        version: 1,
        metadata: options
      }

      // Set up auto-expiration cleanup
      const expirationTimeout = setTimeout(() => {
        this.releaseLock(resourceType, resourceId, lockedBy)
        onLockLost?.()
      }, expiresInMs)

      this.activeLocks.set(lockKey, expirationTimeout)

      // Set up auto-extension if enabled
      if (autoExtend) {
        const extendTimeout = setInterval(() => {
          this.extendLock(resourceType, resourceId, lockedBy, expiresInMs)
            .catch(error => {
              console.error('Failed to extend lock:', error)
              onLockLost?.()
            })
        }, extendIntervalMs)

        this.lockExtensions.set(lockKey, extendTimeout as any)
      }

      return { success: true, lockInfo }

    } catch (error) {
      console.error('Lock acquisition failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to acquire lock'
      }
    }
  }

  /**
   * Extend an existing lock
   */
  async extendLock(
    resourceType: string,
    resourceId: string,
    lockedBy: string,
    extensionMs: number = 300000
  ): Promise<boolean> {
    const lockKey = this.getLockKey(resourceType, resourceId)
    const newExpiresAt = new Date(Date.now() + extensionMs)

    try {
      const { error } = await this.supabase
        .from('resource_locks')
        .update({
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('locked_by', lockedBy)
        .gt('expires_at', new Date().toISOString())

      if (error) {
        console.error('Failed to extend lock:', error)
        return false
      }

      // Update the expiration timeout
      const existingTimeout = this.activeLocks.get(lockKey)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      const newTimeout = setTimeout(() => {
        this.releaseLock(resourceType, resourceId, lockedBy)
      }, extensionMs)

      this.activeLocks.set(lockKey, newTimeout)

      return true
    } catch (error) {
      console.error('Lock extension failed:', error)
      return false
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(
    resourceType: string,
    resourceId: string,
    lockedBy: string
  ): Promise<boolean> {
    const lockKey = this.getLockKey(resourceType, resourceId)

    try {
      const { error } = await this.supabase
        .from('resource_locks')
        .delete()
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('locked_by', lockedBy)

      // Clean up timeouts
      const timeout = this.activeLocks.get(lockKey)
      if (timeout) {
        clearTimeout(timeout)
        this.activeLocks.delete(lockKey)
      }

      const extension = this.lockExtensions.get(lockKey)
      if (extension) {
        clearInterval(extension)
        this.lockExtensions.delete(lockKey)
      }

      return !error
    } catch (error) {
      console.error('Lock release failed:', error)
      return false
    }
  }

  /**
   * Check if a resource is locked
   */
  async isLocked(resourceType: string, resourceId: string): Promise<LockInfo | null> {
    try {
      const { data, error } = await this.supabase
        .from('resource_locks')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) return null

      return {
        resourceId,
        resourceType,
        lockedBy: data.locked_by,
        lockedAt: new Date(data.locked_at),
        expiresAt: new Date(data.expires_at),
        version: data.version,
        metadata: data.metadata
      }
    } catch (error) {
      console.error('Lock check failed:', error)
      return null
    }
  }

  /**
   * Optimistic update with version checking
   */
  async updateWithVersionCheck<T>(
    tableName: string,
    resourceId: string,
    updateData: any,
    expectedVersion: number,
    updatedBy: string
  ): Promise<{ success: boolean; data?: T; conflict?: VersionedResource; error?: string }> {
    try {
      // Get current version
      const { data: current, error: fetchError } = await this.supabase
        .from(tableName)
        .select('version, updated_at, updated_by')
        .eq('id', resourceId)
        .single()

      if (fetchError) {
        throw new AppError('Failed to fetch current version')
      }

      if (current.version !== expectedVersion) {
        return {
          success: false,
          conflict: {
            version: current.version,
            lastModified: new Date(current.updated_at),
            modifiedBy: current.updated_by
          },
          error: `Version conflict: expected ${expectedVersion}, found ${current.version}`
        }
      }

      // Perform update with version increment
      const { data: updated, error: updateError } = await this.supabase
        .from(tableName)
        .update({
          ...updateData,
          version: expectedVersion + 1,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy
        })
        .eq('id', resourceId)
        .eq('version', expectedVersion) // Double-check version in WHERE clause
        .select('*')
        .single()

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          // No rows updated - version conflict
          return {
            success: false,
            error: 'Version conflict during update'
          }
        }
        throw new AppError('Update failed')
      }

      return { success: true, data: updated as T }

    } catch (error) {
      console.error('Optimistic update failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      }
    }
  }

  /**
   * Execute operation with lock
   */
  async withLock<T>(
    resourceType: string,
    resourceId: string,
    lockedBy: string,
    operation: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lockResult = await this.acquireLock(resourceType, resourceId, lockedBy, options)

    if (!lockResult.success) {
      if (lockResult.conflict) {
        throw new ConflictError(
          `Resource is being modified by ${lockResult.conflict.lockedBy}`,
          lockResult.conflict
        )
      }
      throw new AppError(lockResult.error || 'Failed to acquire lock')
    }

    try {
      return await operation()
    } finally {
      await this.releaseLock(resourceType, resourceId, lockedBy)
    }
  }

  /**
   * Clean up expired locks (maintenance function)
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('resource_locks')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        console.error('Failed to cleanup expired locks:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Lock cleanup failed:', error)
      return 0
    }
  }

  /**
   * Get all active locks for monitoring
   */
  async getActiveLocks(resourceType?: string): Promise<LockInfo[]> {
    try {
      let query = this.supabase
        .from('resource_locks')
        .select('*')
        .gt('expires_at', new Date().toISOString())

      if (resourceType) {
        query = query.eq('resource_type', resourceType)
      }

      const { data, error } = await query.order('locked_at', { ascending: false })

      if (error) {
        throw new AppError('Failed to fetch active locks')
      }

      return (data || []).map(lock => ({
        resourceId: lock.resource_id,
        resourceType: lock.resource_type,
        lockedBy: lock.locked_by,
        lockedAt: new Date(lock.locked_at),
        expiresAt: new Date(lock.expires_at),
        version: lock.version,
        metadata: lock.metadata
      }))
    } catch (error) {
      console.error('Failed to get active locks:', error)
      return []
    }
  }

  /**
   * Force release a lock (admin function)
   */
  async forceReleaseLock(
    resourceType: string,
    resourceId: string,
    releasedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('resource_locks')
        .delete()
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)

      // Log the forced release for audit
      await this.supabase
        .from('audit_logs')
        .insert({
          action: 'force_lock_release',
          resource_type: resourceType,
          resource_id: resourceId,
          performed_by: releasedBy,
          details: {
            timestamp: new Date().toISOString(),
            reason: 'Administrative force release'
          }
        })

      return !error
    } catch (error) {
      console.error('Force lock release failed:', error)
      return false
    }
  }
}

// Singleton instance
export const optimisticLockService = new OptimisticLockService()

// Helper functions for common use cases
export async function withEventLock<T>(
  eventId: string,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return optimisticLockService.withLock('event', eventId, userId, operation, {
    expiresInMs: 600000, // 10 minutes for event operations
    autoExtend: true,
    extendIntervalMs: 120000 // Extend every 2 minutes
  })
}

export async function withDrawLock<T>(
  eventId: string,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return optimisticLockService.withLock('draw', eventId, userId, operation, {
    expiresInMs: 1800000, // 30 minutes for draw operations
    autoExtend: true,
    extendIntervalMs: 300000 // Extend every 5 minutes
  })
}