'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Smartphone,
  RefreshCw,
  Home,
  MessageCircle,
  Wifi,
  AlertTriangle,
  Trophy
} from 'lucide-react'
import ErrorBoundary from './error-boundary'

interface PatronErrorBoundaryProps {
  children: React.ReactNode
  eventId?: string
  eventName?: string
  venueContact?: string
}

function PatronErrorFallback({
  error,
  eventId,
  eventName,
  venueContact
}: {
  error: Error
  eventId?: string
  eventName?: string
  venueContact?: string
}) {
  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleContactVenue = () => {
    if (venueContact) {
      window.open(`tel:${venueContact}`)
    }
  }

  const isNetworkError = error.message.toLowerCase().includes('network') ||
                        error.message.toLowerCase().includes('fetch') ||
                        error.message.toLowerCase().includes('cors')

  const isCapacityError = error.message.toLowerCase().includes('capacity') ||
                         error.message.toLowerCase().includes('full')

  const isExpiredError = error.message.toLowerCase().includes('expired') ||
                        error.message.toLowerCase().includes('closed')

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex justify-center mb-4"
            >
              {isNetworkError ? (
                <Wifi className="h-16 w-16 text-orange-500" />
              ) : isCapacityError ? (
                <Trophy className="h-16 w-16 text-yellow-600" />
              ) : (
                <AlertTriangle className="h-16 w-16 text-red-500" />
              )}
            </motion.div>

            <CardTitle className="text-xl text-gray-900">
              {isNetworkError
                ? "Connection Problem"
                : isCapacityError
                ? "Event is Full"
                : isExpiredError
                ? "Event Closed"
                : "Oops! Something went wrong"
              }
            </CardTitle>

            <CardDescription className="text-gray-600">
              {isNetworkError
                ? "Unable to connect. Please check your internet connection."
                : isCapacityError
                ? "This Melbourne Cup sweep is at capacity, but you can still watch!"
                : isExpiredError
                ? "This event has ended or is no longer accepting participants."
                : "We're sorry for the inconvenience. We've been notified of the issue."
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Event Information */}
            {(eventName || eventId) && (
              <Alert>
                <Trophy className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {eventName && (
                      <div><strong>Event:</strong> {eventName}</div>
                    )}
                    {eventId && (
                      <div className="text-xs text-gray-500">
                        <strong>ID:</strong> {eventId}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isExpiredError && (
                <Button
                  onClick={handleRetry}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}

              {isCapacityError && (
                <Button
                  onClick={() => window.location.href = `/events/${eventId}/spectator`}
                  variant="outline"
                  className="w-full border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                  size="lg"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Watch as Spectator
                </Button>
              )}

              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Find Other Events
              </Button>
            </div>

            {/* Venue Contact */}
            {venueContact && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3 text-center">
                  Need help? Contact the venue:
                </p>
                <Button
                  onClick={handleContactVenue}
                  variant="ghost"
                  className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Call Venue
                </Button>
              </div>
            )}

            {/* Technical Details (Collapsed) */}
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-2 p-2 bg-gray-50 rounded">
                <div><strong>Error:</strong> {error.message}</div>
                <div><strong>Time:</strong> {new Date().toLocaleString()}</div>
                <div><strong>Device:</strong> {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</div>
              </div>
            </details>

            {/* Help Text */}
            <div className="text-center text-xs text-gray-500 space-y-1">
              <p>Having trouble? Try refreshing the page or check your connection.</p>
              {isNetworkError && (
                <p className="text-orange-600">
                  Make sure you're connected to WiFi or have mobile data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export function PatronErrorBoundary({
  children,
  eventId,
  eventName,
  venueContact
}: PatronErrorBoundaryProps) {
  return (
    <ErrorBoundary
      context="Patron Join Experience"
      maxRetries={3}
      showDetails={false}
      fallback={
        <PatronErrorFallback
          error={new Error("Join Experience Error")}
          eventId={eventId}
          eventName={eventName}
          venueContact={venueContact}
        />
      }
      onError={(error, errorInfo) => {
        // Log patron-specific error data
        console.error('Patron Experience Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          eventId,
          eventName,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          connection: (navigator as any).connection?.effectiveType || 'unknown'
        })

        // Send analytics event for patron errors
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'patron_error', {
            event_category: 'patron_experience',
            event_label: error.message,
            custom_parameters: {
              event_id: eventId,
              event_name: eventName,
              error_type: error.name
            }
          })
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}