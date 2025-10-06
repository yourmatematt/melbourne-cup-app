'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock,
  Pause,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface NetworkStatusIndicatorProps {
  networkState: {
    isOnline: boolean
    isReconnecting: boolean
    lastDisconnectTime: number | null
    reconnectAttempts: number
    maxReconnectAttempts: number
  }
  drawState: {
    status: string
    currentStep: number
    totalSteps: number
    canResume: boolean
  }
  onRetry?: () => void
  onResume?: () => void
  className?: string
}

export function NetworkStatusIndicator({
  networkState,
  drawState,
  onRetry,
  onResume,
  className = ''
}: NetworkStatusIndicatorProps) {
  const getStatusColor = () => {
    if (!networkState.isOnline) return 'text-red-600'
    if (networkState.isReconnecting) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusIcon = () => {
    if (!networkState.isOnline) return <WifiOff className="w-4 h-4" />
    if (networkState.isReconnecting) return <RefreshCw className="w-4 h-4 animate-spin" />
    return <Wifi className="w-4 h-4" />
  }

  const getStatusMessage = () => {
    if (!networkState.isOnline) {
      const disconnectTime = networkState.lastDisconnectTime
      if (disconnectTime) {
        const secondsAgo = Math.floor((Date.now() - disconnectTime) / 1000)
        return `Disconnected ${secondsAgo}s ago`
      }
      return 'Connection lost'
    }

    if (networkState.isReconnecting) {
      return `Reconnecting... (${networkState.reconnectAttempts}/${networkState.maxReconnectAttempts})`
    }

    return 'Connected'
  }

  const shouldShowReconnectionProgress = networkState.isReconnecting && networkState.reconnectAttempts > 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Network Status Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <motion.div
            animate={{
              scale: networkState.isReconnecting ? [1, 1.1, 1] : 1
            }}
            transition={{
              duration: 1,
              repeat: networkState.isReconnecting ? Infinity : 0
            }}
            className={getStatusColor()}
          >
            {getStatusIcon()}
          </motion.div>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusMessage()}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          {!networkState.isOnline && !networkState.isReconnecting && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}

          {drawState.canResume && onResume && (
            <Button
              size="sm"
              onClick={onResume}
              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
            >
              <Play className="w-3 h-3 mr-1" />
              Resume
            </Button>
          )}
        </div>
      </motion.div>

      {/* Reconnection Progress */}
      <AnimatePresence>
        {shouldShowReconnectionProgress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Reconnection Progress</span>
                <span>{networkState.reconnectAttempts}/{networkState.maxReconnectAttempts}</span>
              </div>
              <Progress
                value={(networkState.reconnectAttempts / networkState.maxReconnectAttempts) * 100}
                className="h-2"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Alerts */}
      <AnimatePresence>
        {!networkState.isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  <p className="font-medium">Connection Lost</p>
                  <p className="text-sm">
                    {drawState.status === 'drawing'
                      ? 'The draw has been paused. It will resume automatically when connection is restored.'
                      : 'Please check your internet connection and try again.'
                    }
                  </p>
                  {drawState.status === 'drawing' && (
                    <div className="flex items-center space-x-2 text-xs">
                      <Pause className="w-3 h-3" />
                      <span>Draw paused at step {drawState.currentStep} of {drawState.totalSteps}</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {networkState.isReconnecting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="space-y-2">
                  <p className="font-medium">Reconnecting...</p>
                  <p className="text-sm">
                    Attempting to restore connection. This may take a few moments.
                  </p>
                  {drawState.status === 'paused' && (
                    <div className="flex items-center space-x-2 text-xs">
                      <Pause className="w-3 h-3" />
                      <span>Draw will resume automatically once connected</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {drawState.canResume && networkState.isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Ready to Resume</p>
                    <p className="text-sm">
                      Previous draw session found. Continue from step {drawState.currentStep}?
                    </p>
                  </div>
                  {onResume && (
                    <Button
                      size="sm"
                      onClick={onResume}
                      className="ml-4 bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Resume
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draw Status */}
      {drawState.status === 'drawing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between text-sm"
        >
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Drawing in Progress
            </Badge>
            <span className="text-gray-600">
              Step {drawState.currentStep} of {drawState.totalSteps}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 border border-gray-300 border-t-blue-600 rounded-full"
            />
            <span>Live</span>
          </div>
        </motion.div>
      )}

      {drawState.status === 'paused' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between text-sm"
        >
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Pause className="w-3 h-3 mr-1" />
              Paused
            </Badge>
            <span className="text-gray-600">
              At step {drawState.currentStep} of {drawState.totalSteps}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}