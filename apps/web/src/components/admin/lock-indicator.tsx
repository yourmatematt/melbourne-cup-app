'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  LockOpen,
  User,
  Clock,
  AlertTriangle,
  Shield,
  Unlock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { optimisticLockService } from '@/lib/services/optimistic-lock'

interface LockInfo {
  resourceId: string
  resourceType: string
  lockedBy: string
  lockedAt: Date
  expiresAt: Date
  version: number
  metadata?: any
}

interface LockIndicatorProps {
  resourceType: string
  resourceId: string
  currentUser: string
  onLockAcquired?: (lockInfo: LockInfo) => void
  onLockLost?: () => void
  onConflict?: (lockedBy: string, lockedAt: Date) => void
  className?: string
  showDetails?: boolean
  autoAcquire?: boolean
}

export function LockIndicator({
  resourceType,
  resourceId,
  currentUser,
  onLockAcquired,
  onLockLost,
  onConflict,
  className = '',
  showDetails = true,
  autoAcquire = false
}: LockIndicatorProps) {
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  const isOwnLock = lockInfo?.lockedBy === currentUser
  const isLocked = !!lockInfo && lockInfo.expiresAt > new Date()

  // Update time remaining
  useEffect(() => {
    if (!lockInfo || !isLocked) {
      setTimeRemaining(0)
      return
    }

    const updateTime = () => {
      const remaining = Math.max(0, lockInfo.expiresAt.getTime() - Date.now())
      setTimeRemaining(remaining)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [lockInfo, isLocked])

  // Check lock status periodically
  useEffect(() => {
    const checkLockStatus = async () => {
      try {
        const currentLock = await optimisticLockService.isLocked(resourceType, resourceId)
        setLockInfo(currentLock)

        if (currentLock && currentLock.lockedBy !== currentUser) {
          onConflict?.(currentLock.lockedBy, currentLock.lockedAt)
        }
      } catch (error) {
        console.error('Failed to check lock status:', error)
      }
    }

    checkLockStatus()
    const interval = setInterval(checkLockStatus, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [resourceType, resourceId, currentUser, onConflict])

  // Auto-acquire lock if requested
  useEffect(() => {
    if (autoAcquire && !isLocked) {
      handleAcquireLock()
    }
  }, [autoAcquire, isLocked])

  const handleAcquireLock = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await optimisticLockService.acquireLock(
        resourceType,
        resourceId,
        currentUser,
        {
          expiresInMs: 600000, // 10 minutes
          autoExtend: true,
          extendIntervalMs: 120000, // Extend every 2 minutes
          onLockLost: () => {
            setLockInfo(null)
            onLockLost?.()
          },
          onConflict: (lockedBy, lockedAt) => {
            onConflict?.(lockedBy, lockedAt)
          }
        }
      )

      if (result.success && result.lockInfo) {
        setLockInfo(result.lockInfo)
        onLockAcquired?.(result.lockInfo)
      } else {
        setError(result.error || 'Failed to acquire lock')
        if (result.conflict) {
          onConflict?.(result.conflict.lockedBy, result.conflict.lockedAt)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to acquire lock'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReleaseLock = async () => {
    if (!isOwnLock) return

    setIsLoading(true)
    try {
      await optimisticLockService.releaseLock(resourceType, resourceId, currentUser)
      setLockInfo(null)
    } catch (error) {
      console.error('Failed to release lock:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getLockStatusColor = () => {
    if (!isLocked) return 'text-gray-500'
    if (isOwnLock) return 'text-green-600'
    return 'text-red-600'
  }

  const getLockStatusIcon = () => {
    if (!isLocked) return <LockOpen className="w-4 h-4" />
    if (isOwnLock) return <Shield className="w-4 h-4" />
    return <Lock className="w-4 h-4" />
  }

  return (
    <TooltipProvider>
      <div className={`space-y-2 ${className}`}>
        {/* Lock Status Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{
                scale: isLoading ? [1, 1.1, 1] : 1
              }}
              transition={{
                duration: 1,
                repeat: isLoading ? Infinity : 0
              }}
              className={getLockStatusColor()}
            >
              {getLockStatusIcon()}
            </motion.div>

            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${getLockStatusColor()}`}>
                  {!isLocked && 'Unlocked'}
                  {isOwnLock && 'Locked by You'}
                  {isLocked && !isOwnLock && 'Locked by Another User'}
                </span>

                {isLocked && (
                  <Badge
                    variant={isOwnLock ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {isOwnLock ? 'Active' : 'Conflict'}
                  </Badge>
                )}
              </div>

              {showDetails && isLocked && (
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{lockInfo.lockedBy}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Expires in {formatTimeRemaining(timeRemaining)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center space-x-2">
            {!isLocked && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAcquireLock}
                    disabled={isLoading}
                    className="h-7 px-2"
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    Lock
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Acquire exclusive control</p>
                </TooltipContent>
              </Tooltip>
            )}

            {isOwnLock && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReleaseLock}
                    disabled={isLoading}
                    className="h-7 px-2"
                  >
                    <Unlock className="w-3 h-3 mr-1" />
                    Release
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Release exclusive control</p>
                </TooltipContent>
              </Tooltip>
            )}

            {timeRemaining > 0 && timeRemaining < 60000 && isOwnLock && (
              <Badge variant="outline" className="text-xs text-orange-600">
                Expiring Soon
              </Badge>
            )}
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{error}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setError(null)}
                      className="h-6 px-2 text-xs"
                    >
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conflict Warning */}
        <AnimatePresence>
          {isLocked && !isOwnLock && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Resource In Use</p>
                    <p className="text-xs">
                      {lockInfo?.lockedBy} is currently modifying this {resourceType}.
                      You cannot make changes until they release control.
                    </p>
                    <div className="text-xs text-orange-600">
                      Lock expires in {formatTimeRemaining(timeRemaining)}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Indicator */}
        <AnimatePresence>
          {isOwnLock && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="border-green-200 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">You have exclusive control</p>
                      <p className="text-xs">
                        Other users cannot modify this {resourceType} while you hold the lock.
                      </p>
                    </div>
                    {timeRemaining < 60000 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        {formatTimeRemaining(timeRemaining)}
                      </Badge>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}