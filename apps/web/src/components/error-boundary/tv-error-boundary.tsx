'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Monitor,
  RefreshCw,
  Settings,
  Wifi,
  AlertTriangle
} from 'lucide-react'
import ErrorBoundary from './error-boundary'

interface TVErrorBoundaryProps {
  children: React.ReactNode
  eventId: string
  onRetry?: () => void
}

function TVErrorFallback({ error, eventId, onRetry }: {
  error: Error
  eventId: string
  onRetry?: () => void
}) {
  const handleFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  const isNetworkError = error.message.toLowerCase().includes('network') ||
                        error.message.toLowerCase().includes('fetch')

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center text-white max-w-2xl"
      >
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="mb-8"
        >
          <Monitor className="w-24 h-24 mx-auto text-white/80" />
        </motion.div>

        <h1 className="text-4xl font-bold mb-4">
          TV Display Error
        </h1>

        <p className="text-xl text-white/80 mb-8">
          {isNetworkError
            ? "Lost connection to the server. Checking connection..."
            : "The TV display encountered an error and needs to restart."
          }
        </p>

        <div className="bg-black/20 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-2">Error Details</h3>
          <p className="text-sm text-white/70 font-mono">
            {error.message}
          </p>
          <p className="text-xs text-white/50 mt-2">
            Event ID: {eventId}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onRetry || handleReload}
            size="lg"
            className="bg-white text-red-900 hover:bg-white/90 font-semibold px-8"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Restart Display
          </Button>

          <Button
            onClick={handleFullscreen}
            variant="outline"
            size="lg"
            className="border-white text-white hover:bg-white/10 font-semibold px-8"
          >
            <Monitor className="w-5 h-5 mr-2" />
            Enter Fullscreen
          </Button>
        </div>

        <div className="mt-8 text-sm text-white/60">
          <p>If the problem persists, contact the event organizer</p>
          <p className="mt-1">Press F5 to force refresh, or ESC then F to toggle fullscreen</p>
        </div>
      </motion.div>
    </div>
  )
}

export function TVErrorBoundary({ children, eventId, onRetry }: TVErrorBoundaryProps) {
  return (
    <ErrorBoundary
      context="TV Display"
      maxRetries={5}
      showDetails={false}
      fallback={
        <TVErrorFallback
          error={new Error("TV Display Error")}
          eventId={eventId}
          onRetry={onRetry}
        />
      }
      onError={(error, errorInfo) => {
        // Log TV-specific error data
        console.error('TV Display Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          eventId,
          timestamp: new Date().toISOString(),
          isFullscreen: !!document.fullscreenElement,
          userAgent: navigator.userAgent
        })

        // Try to auto-recover for network errors
        if (error.message.toLowerCase().includes('network')) {
          setTimeout(() => {
            window.location.reload()
          }, 5000) // Auto-reload after 5 seconds for network errors
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}