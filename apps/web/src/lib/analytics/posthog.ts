'use client'

import { PostHog } from 'posthog-js'

// PostHog client instance
let posthogClient: PostHog | null = null

// Initialize PostHog
export function initPostHog(): PostHog | null {
  if (
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
  ) {
    if (!posthogClient) {
      posthogClient = new PostHog(
        process.env.NEXT_PUBLIC_POSTHOG_KEY,
        {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
          loaded: (posthog) => {
            // Enable debug mode in development
            if (process.env.NODE_ENV === 'development') {
              posthog.debug()
            }
          },
          capture_pageview: false, // We'll handle pageviews manually
          capture_pageleave: true,
          disable_session_recording: process.env.NODE_ENV === 'development',

          // Privacy settings
          respect_dnt: true,
          opt_out_capturing_by_default: false,

          // Performance settings
          batch_requests: true,
          request_batching: true,

          // Feature flags
          bootstrap: {
            distinctID: 'anonymous'
          }
        }
      )
    }
    return posthogClient
  }
  return null
}

// Get PostHog instance
export function getPostHog(): PostHog | null {
  return posthogClient
}

// User identification
export function identifyUser(userId: string, properties?: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.identify(userId, properties)
  }
}

// Reset user (logout)
export function resetUser() {
  const posthog = getPostHog()
  if (posthog) {
    posthog.reset()
  }
}

// Page view tracking
export function trackPageView(path: string, properties?: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      path,
      ...properties
    })
  }
}

// Event tracking functions

// Patron journey tracking
export function trackPatronJoin(eventId: string, method: 'qr' | 'link' | 'manual') {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('patron_join_attempt', {
      event_id: eventId,
      join_method: method,
      timestamp: new Date().toISOString()
    })
  }
}

export function trackPatronJoinSuccess(eventId: string, patronId: string, drawOrder?: number) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('patron_join_success', {
      event_id: eventId,
      patron_id: patronId,
      draw_order: drawOrder,
      timestamp: new Date().toISOString()
    })
  }
}

export function trackPatronJoinFailure(eventId: string, reason: string, errorCode?: string) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('patron_join_failure', {
      event_id: eventId,
      failure_reason: reason,
      error_code: errorCode,
      timestamp: new Date().toISOString()
    })
  }
}

// Event management tracking
export function trackEventCreated(eventId: string, eventType: 'sweep' | 'calcutta', capacity: number) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('event_created', {
      event_id: eventId,
      event_type: eventType,
      capacity,
      timestamp: new Date().toISOString()
    })
  }
}

export function trackEventPublished(eventId: string) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('event_published', {
      event_id: eventId,
      timestamp: new Date().toISOString()
    })
  }
}

export function trackDrawStarted(eventId: string, participantCount: number) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('draw_started', {
      event_id: eventId,
      participant_count: participantCount,
      timestamp: new Date().toISOString()
    })
  }
}

export function trackDrawCompleted(eventId: string, duration: number, assignmentsCreated: number) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('draw_completed', {
      event_id: eventId,
      duration_ms: duration,
      assignments_created: assignmentsCreated,
      timestamp: new Date().toISOString()
    })
  }
}

export function trackDrawError(eventId: string, error: string, step?: number) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('draw_error', {
      event_id: eventId,
      error_message: error,
      failed_at_step: step,
      timestamp: new Date().toISOString()
    })
  }
}

// TV display tracking
export function trackTVDisplayViewed(eventId: string, viewDuration?: number) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('tv_display_viewed', {
      event_id: eventId,
      view_duration_ms: viewDuration,
      timestamp: new Date().toISOString()
    })
  }
}

export function trackTVDisplayError(eventId: string, error: string) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('tv_display_error', {
      event_id: eventId,
      error_message: error,
      timestamp: new Date().toISOString()
    })
  }
}

// QR code tracking
export function trackQRCodeGenerated(eventId: string) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('qr_code_generated', {
      event_id: eventId,
      timestamp: new Date().toISOString()
    })
  }
}

export function trackQRCodeScanned(eventId: string, success: boolean, error?: string) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('qr_code_scanned', {
      event_id: eventId,
      scan_success: success,
      error_message: error,
      timestamp: new Date().toISOString()
    })
  }
}

// Performance tracking
export function trackPerformance(action: string, duration: number, context?: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog && duration > 1000) { // Only track slow operations
    posthog.capture('performance_metric', {
      action,
      duration_ms: duration,
      is_slow: duration > 3000,
      ...context,
      timestamp: new Date().toISOString()
    })
  }
}

// Error tracking
export function trackError(error: string, context?: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('application_error', {
      error_message: error,
      ...context,
      timestamp: new Date().toISOString()
    })
  }
}

// Feature usage tracking
export function trackFeatureUsage(feature: string, context?: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('feature_used', {
      feature_name: feature,
      ...context,
      timestamp: new Date().toISOString()
    })
  }
}

// Admin actions tracking
export function trackAdminAction(action: string, resourceType: string, resourceId: string) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('admin_action', {
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      timestamp: new Date().toISOString()
    })
  }
}

// Business metrics
export function trackBusinessMetric(metric: string, value: number, context?: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('business_metric', {
      metric_name: metric,
      metric_value: value,
      ...context,
      timestamp: new Date().toISOString()
    })
  }
}

// A/B testing and feature flags
export function getFeatureFlag(flagKey: string, defaultValue: boolean = false): boolean {
  const posthog = getPostHog()
  if (posthog) {
    return posthog.isFeatureEnabled(flagKey) ?? defaultValue
  }
  return defaultValue
}

export function trackFeatureFlagUsage(flagKey: string, variant: string, context?: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.capture('feature_flag_used', {
      flag_key: flagKey,
      variant,
      ...context,
      timestamp: new Date().toISOString()
    })
  }
}

// User properties
export function setUserProperties(properties: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.setPersonProperties(properties)
  }
}

// Group analytics (for tenants)
export function identifyTenant(tenantId: string, properties?: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.group('tenant', tenantId, properties)
  }
}

// Event properties
export function setEventProperties(eventId: string, properties: Record<string, any>) {
  const posthog = getPostHog()
  if (posthog) {
    posthog.group('event', eventId, properties)
  }
}

// Cleanup on app unmount
export function cleanup() {
  const posthog = getPostHog()
  if (posthog) {
    posthog.opt_out_capturing()
  }
}

// Hook for React components
export function useAnalytics() {
  return {
    trackPageView,
    trackPatronJoin,
    trackPatronJoinSuccess,
    trackPatronJoinFailure,
    trackEventCreated,
    trackEventPublished,
    trackDrawStarted,
    trackDrawCompleted,
    trackDrawError,
    trackTVDisplayViewed,
    trackTVDisplayError,
    trackQRCodeGenerated,
    trackQRCodeScanned,
    trackPerformance,
    trackError,
    trackFeatureUsage,
    trackAdminAction,
    trackBusinessMetric,
    getFeatureFlag,
    trackFeatureFlagUsage,
    setUserProperties,
    identifyUser,
    identifyTenant,
    setEventProperties,
    resetUser
  }
}