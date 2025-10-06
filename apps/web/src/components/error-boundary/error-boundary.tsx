'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Wifi,
  Server,
  Database,
  Shield
} from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  maxRetries?: number
  context?: string
}

// Error classification
type ErrorType = 'network' | 'auth' | 'validation' | 'server' | 'unknown'

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    this.logError(error, errorInfo)

    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  componentWillUnmount() {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Error Data:', errorData)
      console.groupEnd()
    }

    // Send to error monitoring service (e.g., Sentry, LogRocket)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          error_id: this.state.errorId,
          context: this.props.context
        }
      })
    }
  }

  private classifyError = (error: Error): ErrorType => {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return 'network'
    }

    if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('auth')) {
      return 'auth'
    }

    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation'
    }

    if (message.includes('server') || message.includes('500') || message.includes('internal')) {
      return 'server'
    }

    return 'unknown'
  }

  private getErrorIcon = (errorType: ErrorType) => {
    switch (errorType) {
      case 'network':
        return <Wifi className="h-12 w-12 text-orange-500" />
      case 'auth':
        return <Shield className="h-12 w-12 text-red-500" />
      case 'validation':
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />
      case 'server':
        return <Server className="h-12 w-12 text-red-500" />
      default:
        return <Bug className="h-12 w-12 text-gray-500" />
    }
  }

  private getErrorMessage = (errorType: ErrorType, error: Error) => {
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Problem',
          description: 'Unable to connect to our servers. Please check your internet connection and try again.',
          action: 'Check your connection and retry'
        }
      case 'auth':
        return {
          title: 'Authentication Error',
          description: 'Your session has expired or you don\'t have permission to access this resource.',
          action: 'Please sign in again'
        }
      case 'validation':
        return {
          title: 'Invalid Data',
          description: 'The information provided is invalid or incomplete.',
          action: 'Please check your input and try again'
        }
      case 'server':
        return {
          title: 'Server Error',
          description: 'Our servers are experiencing issues. We\'ve been notified and are working on a fix.',
          action: 'Please try again in a few minutes'
        }
      default:
        return {
          title: 'Something went wrong',
          description: 'An unexpected error occurred. We\'ve been notified and are investigating.',
          action: 'Please try refreshing the page'
        }
    }
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props

    if (this.state.retryCount >= maxRetries) {
      return
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }))

    // Add exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000)

    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      })
    }, delay)

    this.retryTimeouts.push(timeout)
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report: ${this.state.error?.message || 'Unknown Error'}`)
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Context: ${this.props.context || 'Unknown'}
Error: ${this.state.error?.message || 'Unknown error'}
Stack: ${this.state.error?.stack || 'No stack trace'}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim())

    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const errorType = this.classifyError(this.state.error)
      const errorMessage = this.getErrorMessage(errorType, this.state.error)
      const { maxRetries = 3, showDetails = true } = this.props

      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card>
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex justify-center mb-4"
                >
                  {this.getErrorIcon(errorType)}
                </motion.div>
                <CardTitle className="text-xl text-gray-900">
                  {errorMessage.title}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {errorMessage.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Action Buttons */}
                <div className="space-y-3">
                  {this.state.retryCount < maxRetries && (
                    <Button
                      onClick={this.handleRetry}
                      className="w-full"
                      disabled={this.state.retryCount >= maxRetries}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/${maxRetries})`}
                    </Button>
                  )}

                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    className="w-full"
                  >
                    Reset Component
                  </Button>

                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="w-full"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Home
                  </Button>
                </div>

                {/* Error Details */}
                {showDetails && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          Technical Details
                        </summary>
                        <div className="mt-2 space-y-2 text-xs">
                          <div>
                            <strong>Error ID:</strong> {this.state.errorId}
                          </div>
                          <div>
                            <strong>Message:</strong> {this.state.error.message}
                          </div>
                          {this.props.context && (
                            <div>
                              <strong>Context:</strong> {this.props.context}
                            </div>
                          )}
                          <div>
                            <strong>Time:</strong> {new Date().toLocaleString()}
                          </div>
                        </div>
                      </details>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Support Contact */}
                <div className="text-center">
                  <Button
                    onClick={this.handleReportBug}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Report this issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook for error boundary context
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

export default ErrorBoundary