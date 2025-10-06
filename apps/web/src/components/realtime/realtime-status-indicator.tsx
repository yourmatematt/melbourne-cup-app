'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, AlertCircle, Check, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RealtimeState {
  isConnected: boolean
  isReconnecting: boolean
  hasError: boolean
  lastUpdated: Date | null
}

interface RealtimeStatusIndicatorProps {
  realtimeState: RealtimeState
  onReconnect?: () => void
  onRefresh?: () => void
  compact?: boolean
  showDetails?: boolean
  className?: string
}

export function RealtimeStatusIndicator({
  realtimeState,
  onReconnect,
  onRefresh,
  compact = false,
  showDetails = false,
  className = ''
}: RealtimeStatusIndicatorProps) {
  const { isConnected, isReconnecting, hasError, lastUpdated } = realtimeState

  const getStatusInfo = () => {
    if (isReconnecting) {
      return {
        icon: RefreshCw,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        status: 'Reconnecting...',
        description: 'Attempting to restore real-time connection'
      }
    }

    if (hasError || !isConnected) {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        status: 'Disconnected',
        description: 'Real-time updates are not available'
      }
    }

    return {
      icon: Wifi,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      status: 'Connected',
      description: 'Real-time updates are active'
    }
  }

  const statusInfo = getStatusInfo()
  const Icon = statusInfo.icon

  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)

    if (diffSec < 60) {
      return `${diffSec}s ago`
    } else if (diffMin < 60) {
      return `${diffMin}m ago`
    } else if (diffHour < 24) {
      return `${diffHour}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className={`inline-flex items-center space-x-2 ${className}`}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                repeat: isReconnecting ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              <motion.div
                animate={isReconnecting ? { rotate: 360 } : {}}
                transition={{
                  duration: 1,
                  repeat: isReconnecting ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <Icon className={`w-4 h-4 ${statusInfo.color}`} />
              </motion.div>

              {!isConnected && !isReconnecting && (
                <motion.button
                  onClick={onReconnect}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Retry
                </motion.button>
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">{statusInfo.status}</div>
              <div className="text-xs text-gray-600">{statusInfo.description}</div>
              {lastUpdated && (
                <div className="text-xs text-gray-500 mt-1">
                  Last update: {formatLastUpdated(lastUpdated)}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={className}
      >
        <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={isReconnecting ? { rotate: 360 } : {}}
                  transition={{
                    duration: 1,
                    repeat: isReconnecting ? Infinity : 0,
                    ease: "linear"
                  }}
                >
                  <Icon className={`w-5 h-5 ${statusInfo.color}`} />
                </motion.div>

                <div>
                  <div className={`font-medium text-sm ${statusInfo.color}`}>
                    {statusInfo.status}
                  </div>
                  {showDetails && (
                    <div className="text-xs text-gray-600">
                      {statusInfo.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {lastUpdated && (
                  <div className="text-xs text-gray-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatLastUpdated(lastUpdated)}</span>
                  </div>
                )}

                {!isConnected && !isReconnecting && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReconnect}
                    className="h-7 px-2 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reconnect
                  </Button>
                )}

                {onRefresh && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRefresh}
                    className="h-7 px-2 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                )}
              </div>
            </div>

            {showDetails && lastUpdated && (
              <motion.div
                className="mt-2 pt-2 border-t border-gray-200"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Last sync:</span>
                    <span>{lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}