import * as Sentry from '@sentry/nextjs'
import React from 'react'

// Sentry configuration
export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Error filtering
      beforeSend(event) {
        // Filter out common, non-actionable errors
        if (event.exception) {
          const error = event.exception.values?.[0]
          const errorMessage = error?.value?.toLowerCase() || ''

          // Filter out network errors from ad blockers, etc.
          if (
            errorMessage.includes('network error') ||
            errorMessage.includes('failed to fetch') ||
            errorMessage.includes('load denied by x-frame-options') ||
            errorMessage.includes('script error') ||
            errorMessage.includes('non-error promise rejection')
          ) {
            return null
          }
        }

        return event
      },

      // Additional context
      initialScope: {
        tags: {
          component: 'melbourne-cup-app'
        }
      },

      // Release tracking
      release: process.env.VERCEL_GIT_COMMIT_SHA,

      // User privacy
      beforeSendTransaction(event) {
        // Remove sensitive data from transactions
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/\/patron\/[^\/]+/, '/patron/[id]')
          event.request.url = event.request.url.replace(/\/event\/[^\/]+/, '/event/[id]')
        }
        return event
      }
    })
  }
}

// Custom error boundary for Sentry
export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value)
        })
      }
      Sentry.captureException(error)
    })
  } else {
    console.error('Error:', error, context)
  }
}

// Performance monitoring
export function capturePerformance(name: string, startTime: number, context?: Record<string, any>) {
  const duration = performance.now() - startTime

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message: `Performance: ${name}`,
      category: 'performance',
      data: {
        duration: `${duration.toFixed(2)}ms`,
        ...context
      },
      level: 'info'
    })
  }

  // Also log slow operations
  if (duration > 1000) {
    console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, context)
  }
}

// User context
export function setUserContext(user: { id: string; role?: string; tenantId?: string }) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      role: user.role,
      tenant_id: user.tenantId
    })
  }
}

// Custom tags
export function setEventContext(event: { id: string; name: string; status: string }) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setTag('event_id', event.id)
    Sentry.setTag('event_status', event.status)
    Sentry.setContext('event', {
      id: event.id,
      name: event.name,
      status: event.status
    })
  }
}

// API monitoring
export function monitorAPI(endpoint: string, method: string, statusCode: number, duration: number) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message: `API: ${method} ${endpoint}`,
      category: 'http',
      data: {
        status_code: statusCode,
        duration: `${duration.toFixed(2)}ms`,
        method,
        endpoint
      },
      level: statusCode >= 400 ? 'error' : 'info'
    })

    // Create transaction for API calls
    const transaction = Sentry.startTransaction({
      name: `${method} ${endpoint}`,
      op: 'http.server'
    })

    transaction.setData('http.status_code', statusCode)
    transaction.setData('http.method', method)
    transaction.finish()
  }
}

// Database monitoring
export function monitorDatabase(operation: string, table: string, duration: number, error?: Error) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const level = error ? 'error' : duration > 1000 ? 'warning' : 'info'

    Sentry.addBreadcrumb({
      message: `DB: ${operation} ${table}`,
      category: 'query',
      data: {
        operation,
        table,
        duration: `${duration.toFixed(2)}ms`,
        error: error?.message
      },
      level
    })

    if (error) {
      captureError(error, { operation, table, duration })
    }
  }
}

// Real-time monitoring
export function monitorRealtime(event: string, success: boolean, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message: `Realtime: ${event}`,
      category: 'websocket',
      data: {
        event,
        success,
        ...context
      },
      level: success ? 'info' : 'error'
    })
  }
}

// Draw process monitoring
export function monitorDrawProcess(step: string, success: boolean, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message: `Draw: ${step}`,
      category: 'business_logic',
      data: {
        step,
        success,
        ...context
      },
      level: success ? 'info' : 'error'
    })

    if (!success) {
      Sentry.captureMessage(`Draw process failed at step: ${step}`, 'error')
    }
  }
}

// Component error boundary
export class SentryErrorBoundary extends Sentry.ErrorBoundary {
  constructor(props: any) {
    super({
      ...props,
      fallback: ({ error, resetError }: { error: Error; resetError: () => void }) => (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We've been notified of this error and are working to fix it.
            </p>
            <button
              onClick={resetError}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ),
      beforeCapture: (scope: Sentry.Scope) => {
        scope.setTag('errorBoundary', true)
      }
    })
  }
}