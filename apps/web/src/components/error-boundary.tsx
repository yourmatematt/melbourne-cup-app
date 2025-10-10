'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; errorInfo?: React.ErrorInfo; reset: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console for debugging
    console.error('React Error Boundary caught an error:', error, errorInfo)

    // Update state with error info
    this.setState({
      hasError: true,
      error,
      errorInfo
    })
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error} errorInfo={this.state.errorInfo} reset={this.reset} />
      }

      // Default fallback UI
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)'
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center'
          }}>
            <h1 style={{
              color: '#dc2626',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px'
            }}>
              🚨 React Error Caught
            </h1>
            <p style={{
              color: '#6b7280',
              marginBottom: '24px'
            }}>
              Something went wrong in the Live View component. This error has been caught by the error boundary.
            </p>
            {this.state.error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '16px',
                borderRadius: '4px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <strong>Error:</strong> {this.state.error.message}
                <br />
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ cursor: 'pointer', color: '#dc2626' }}>
                    Show error stack
                  </summary>
                  <pre style={{
                    fontSize: '12px',
                    overflow: 'auto',
                    marginTop: '8px',
                    color: '#374151'
                  }}>
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.reset}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary