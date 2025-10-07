'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Trophy, Crown, Users, Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface RealtimeNotification {
  id: string
  type: 'participant_added' | 'assignment_created' | 'status_changed' | 'winner_announced'
  title: string
  message: string
  timestamp: Date
  autoHide?: boolean
  duration?: number
  data?: any
}

interface RealtimeNotificationProps {
  notifications: RealtimeNotification[]
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  maxVisible?: number
}

export function RealtimeNotificationContainer({
  notifications,
  onDismiss,
  position = 'top-right',
  maxVisible = 3
}: RealtimeNotificationProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<RealtimeNotification[]>([])

  // Manage visible notifications
  useEffect(() => {
    setVisibleNotifications(notifications.slice(0, maxVisible))
  }, [notifications, maxVisible])

  // Auto-hide notifications
  useEffect(() => {
    visibleNotifications.forEach(notification => {
      if (notification.autoHide !== false) {
        const duration = notification.duration || 5000
        const timer = setTimeout(() => {
          onDismiss(notification.id)
        }, duration)

        return () => clearTimeout(timer)
      }
    })
  }, [visibleNotifications, onDismiss])

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  const getNotificationIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'participant_added':
        return UserPlus
      case 'assignment_created':
        return Trophy
      case 'status_changed':
        return Bell
      case 'winner_announced':
        return Crown
      default:
        return Bell
    }
  }

  const getNotificationColors = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'participant_added':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800'
        }
      case 'assignment_created':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'text-green-800'
        }
      case 'status_changed':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          icon: 'text-purple-600',
          title: 'text-purple-800'
        }
      case 'winner_announced':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-800'
        }
    }
  }

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className={`fixed z-50 pointer-events-none ${getPositionClasses()}`}>
      <div className="space-y-2 w-80">
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification, index) => {
            const Icon = getNotificationIcon(notification.type)
            const colors = getNotificationColors(notification.type)

            return (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, x: position.includes('right') ? 300 : -300, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: position.includes('right') ? 300 : -300, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  layout: { duration: 0.2 }
                }}
                className="pointer-events-auto"
                whileHover={{ scale: 1.02 }}
              >
                <Card className={`${colors.bg} ${colors.border} border shadow-lg`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                      >
                        <Icon className={`w-5 h-5 ${colors.icon} mt-0.5`} />
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <motion.h4
                          className={`font-medium text-sm ${colors.title}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          {notification.title}
                        </motion.h4>
                        <motion.p
                          className="text-sm text-gray-600 mt-1"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          {notification.message}
                        </motion.p>
                        <motion.div
                          className="text-xs text-gray-500 mt-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          {notification.timestamp.toLocaleTimeString()}
                        </motion.div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDismiss(notification.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Progress bar for auto-hide */}
                    {notification.autoHide !== false && (
                      <motion.div
                        className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <motion.div
                          className={`h-full ${colors.icon.replace('text-', 'bg-')}`}
                          initial={{ width: '100%' }}
                          animate={{ width: '0%' }}
                          transition={{
                            duration: (notification.duration || 5000) / 1000,
                            ease: "linear"
                          }}
                        />
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Show more indicator */}
        {notifications.length > maxVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-2">
                <div className="text-xs text-gray-600">
                  +{notifications.length - maxVisible} more notifications
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Hook for managing notifications
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])

  const addNotification = (notification: Omit<RealtimeNotification, 'id' | 'timestamp'>) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    }

    setNotifications(prev => [newNotification, ...prev])
    return newNotification.id
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Participant added notification
  const notifyParticipantAdded = (participant: any) => {
    addNotification({
      type: 'participant_added',
      title: 'New Participant!',
      message: `${participant.participant_name} joined the sweep`,
      autoHide: true,
      duration: 4000,
      data: participant
    })
  }

  // Assignment created notification
  const notifyAssignmentCreated = (participant: any, horse: any) => {
    addNotification({
      type: 'assignment_created',
      title: 'Horse Assigned!',
      message: `${participant.participant_name} got #${horse.number} ${horse.name}`,
      autoHide: true,
      duration: 6000,
      data: { participant, horse }
    })
  }

  // Status changed notification
  const notifyStatusChanged = (oldStatus: string, newStatus: string) => {
    const statusMessages = {
      lobby: 'Event is now in lobby mode',
      drawing: 'Draw has started!',
      complete: 'Event is complete'
    }

    addNotification({
      type: 'status_changed',
      title: 'Status Update',
      message: statusMessages[newStatus as keyof typeof statusMessages] || `Status changed to ${newStatus}`,
      autoHide: true,
      duration: 5000,
      data: { oldStatus, newStatus }
    })
  }

  // Winner announced notification
  const notifyWinnerAnnounced = (winner: any) => {
    addNotification({
      type: 'winner_announced',
      title: '🏆 We have a winner!',
      message: `${winner.participant.participant_name} wins with ${winner.horse.name}!`,
      autoHide: false,
      data: winner
    })
  }

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
    notifyParticipantAdded,
    notifyAssignmentCreated,
    notifyStatusChanged,
    notifyWinnerAnnounced
  }
}