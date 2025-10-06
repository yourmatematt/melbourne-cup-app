'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AnalyticsData {
  eventStats: {
    totalParticipants: number
    conversionRate: number
    leadCaptureRate: number
    averageJoinTime: number
  }
  engagement: {
    peakJoinPeriods: Array<{
      hour: number
      count: number
      timestamp: string
    }>
    dropOffPoints: Array<{
      stage: string
      count: number
      percentage: number
    }>
    deviceBreakdown: Array<{
      device: string
      count: number
      percentage: number
    }>
  }
  marketing: {
    emailConsentRate: number
    phoneConsentRate: number
    totalMarketableLeads: number
    consentBreakdown: {
      emailOnly: number
      phoneOnly: number
      both: number
      neither: number
    }
  }
  timeline: Array<{
    date: string
    participants: number
    cumulative: number
  }>
  demographics?: {
    joinMethods: Array<{
      method: string
      count: number
      percentage: number
    }>
  }
}

interface ExportOptions {
  format?: 'csv' | 'json'
  includeAssignments?: boolean
}

export function useAnalytics(eventId: string) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const supabase = createClient()

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    if (!eventId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/analytics`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load analytics')
      }

      setData(result.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      console.error('Analytics loading error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  // Export participants
  const exportParticipants = useCallback(async (options: ExportOptions = {}) => {
    const { format = 'csv', includeAssignments = true } = options

    try {
      const url = `/api/events/${eventId}/export/participants?format=${format}&include_assignments=${includeAssignments}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `participants_export.${format}`

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      return { success: true }
    } catch (err) {
      console.error('Export participants error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Export failed'
      }
    }
  }, [eventId])

  // Export leads
  const exportLeads = useCallback(async (options: ExportOptions = {}) => {
    const { format = 'csv', includeAssignments = true } = options

    try {
      const url = `/api/events/${eventId}/export/leads?format=${format}&include_assignments=${includeAssignments}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `leads_export.${format}`

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      return { success: true }
    } catch (err) {
      console.error('Export leads error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Export failed'
      }
    }
  }, [eventId])

  // Refresh analytics with optimistic updates
  const refreshAnalytics = useCallback(async () => {
    // Don't show loading state for refresh
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/analytics`)
      const result = await response.json()

      if (response.ok) {
        setData(result.data)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Analytics refresh error:', err)
      // Don't set error for background refresh failures
    }
  }, [eventId])

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback(() => {
    if (!eventId) return () => {}

    const channel = supabase
      .channel(`analytics_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patron_entries',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          // Refresh analytics when participants change
          refreshAnalytics()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          // Refresh analytics when assignments change
          refreshAnalytics()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId, refreshAnalytics, supabase])

  // Load analytics on mount
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Set up real-time subscriptions
  useEffect(() => {
    const unsubscribe = subscribeToUpdates()
    return unsubscribe
  }, [subscribeToUpdates])

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    loadAnalytics,
    refreshAnalytics,
    exportParticipants,
    exportLeads,
    subscribeToUpdates
  }
}

// Hook for specific analytics metrics
export function useAnalyticsMetrics(eventId: string) {
  const { data, isLoading, error } = useAnalytics(eventId)

  return {
    isLoading,
    error,
    metrics: data ? {
      // Key Performance Indicators
      totalParticipants: data.eventStats.totalParticipants,
      conversionRate: data.eventStats.conversionRate,
      leadCaptureRate: data.eventStats.leadCaptureRate,
      averageJoinTime: data.eventStats.averageJoinTime,

      // Marketing Metrics
      marketableLeads: data.marketing.totalMarketableLeads,
      emailConsentRate: data.marketing.emailConsentRate,
      phoneConsentRate: data.marketing.phoneConsentRate,

      // Engagement Metrics
      peakHour: data.engagement.peakJoinPeriods[0]?.hour || 0,
      peakCount: data.engagement.peakJoinPeriods[0]?.count || 0,
      mobilePercentage: data.engagement.deviceBreakdown.find(d => d.device === 'Mobile')?.percentage || 0,

      // Growth Metrics
      dailyGrowth: data.timeline.length > 1
        ? data.timeline[data.timeline.length - 1].participants - data.timeline[data.timeline.length - 2].participants
        : 0,
      totalGrowth: data.timeline[data.timeline.length - 1]?.cumulative || 0
    } : null
  }
}

// Utility functions for analytics calculations
export const analyticsUtils = {
  // Calculate percentage change
  calculatePercentageChange: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  },

  // Format metrics for display
  formatMetric: (value: number, type: 'number' | 'percentage' | 'currency' | 'time'): string => {
    switch (type) {
      case 'number':
        return value.toLocaleString()
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'currency':
        return `$${value.toFixed(2)}`
      case 'time':
        return `${Math.round(value)}m`
      default:
        return value.toString()
    }
  },

  // Get color for metric based on performance
  getMetricColor: (value: number, goodThreshold: number, excellentThreshold: number): string => {
    if (value >= excellentThreshold) return 'text-green-600'
    if (value >= goodThreshold) return 'text-yellow-600'
    return 'text-red-600'
  },

  // Calculate engagement score (0-100)
  calculateEngagementScore: (data: AnalyticsData): number => {
    const conversionWeight = 0.3
    const leadCaptureWeight = 0.3
    const consentWeight = 0.4

    const conversionScore = Math.min(data.eventStats.conversionRate, 100)
    const leadCaptureScore = data.eventStats.leadCaptureRate
    const consentScore = (data.marketing.emailConsentRate + data.marketing.phoneConsentRate) / 2

    return (
      conversionScore * conversionWeight +
      leadCaptureScore * leadCaptureWeight +
      consentScore * consentWeight
    )
  }
}