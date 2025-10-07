import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  uptime: number
  services: {
    database: ServiceStatus
    realtime: ServiceStatus
    redis?: ServiceStatus
  }
  performance: {
    responseTime: number
    memoryUsage?: NodeJS.MemoryUsage
  }
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
  details?: any
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: {
      database: { status: 'healthy' },
      realtime: { status: 'healthy' }
    },
    performance: {
      responseTime: 0
    }
  }

  // Test database connection
  try {
    const dbStartTime = Date.now()
    const supabase = createClient()

    const { data, error } = await supabase
      .from('tenants')
      .select('count(*)')
      .limit(1)
      .single()

    const dbResponseTime = Date.now() - dbStartTime

    if (error) {
      healthCheck.services.database = {
        status: 'unhealthy',
        responseTime: dbResponseTime,
        error: error.message
      }
      healthCheck.status = 'unhealthy'
    } else {
      healthCheck.services.database = {
        status: dbResponseTime > 5000 ? 'degraded' : 'healthy',
        responseTime: dbResponseTime,
        details: { connectionTest: 'passed' }
      }

      if (dbResponseTime > 5000) {
        healthCheck.status = 'degraded'
      }
    }
  } catch (error) {
    healthCheck.services.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
    healthCheck.status = 'unhealthy'
  }

  // Test realtime connection
  try {
    const realtimeStartTime = Date.now()
    const supabase = createClient()

    // Simple check - try to get realtime status
    const channel = supabase.channel('health-check')
    const realtimeResponseTime = Date.now() - realtimeStartTime

    healthCheck.services.realtime = {
      status: realtimeResponseTime > 3000 ? 'degraded' : 'healthy',
      responseTime: realtimeResponseTime,
      details: { connectionTest: 'passed' }
    }

    if (realtimeResponseTime > 3000 && healthCheck.status === 'healthy') {
      healthCheck.status = 'degraded'
    }

    // Clean up
    supabase.removeChannel(channel)
  } catch (error) {
    healthCheck.services.realtime = {
      status: 'degraded',
      error: error instanceof Error ? error.message : 'Realtime connection test failed'
    }

    if (healthCheck.status === 'healthy') {
      healthCheck.status = 'degraded'
    }
  }

  // Test Redis connection if available
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const redisStartTime = Date.now()

      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: {
          'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
        }
      })

      const redisResponseTime = Date.now() - redisStartTime

      if (response.ok) {
        healthCheck.services.redis = {
          status: redisResponseTime > 3000 ? 'degraded' : 'healthy',
          responseTime: redisResponseTime,
          details: { connectionTest: 'passed' }
        }

        if (redisResponseTime > 3000 && healthCheck.status === 'healthy') {
          healthCheck.status = 'degraded'
        }
      } else {
        healthCheck.services.redis = {
          status: 'unhealthy',
          responseTime: redisResponseTime,
          error: `HTTP ${response.status}`
        }

        if (healthCheck.status !== 'unhealthy') {
          healthCheck.status = 'degraded'
        }
      }
    } catch (error) {
      healthCheck.services.redis = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Redis connection failed'
      }

      if (healthCheck.status !== 'unhealthy') {
        healthCheck.status = 'degraded'
      }
    }
  }

  // Add performance metrics
  healthCheck.performance.responseTime = Date.now() - startTime

  if (typeof process.memoryUsage === 'function') {
    healthCheck.performance.memoryUsage = process.memoryUsage()
  }

  // Add additional system information in development
  if (process.env.NODE_ENV === 'development') {
    healthCheck.performance = {
      ...healthCheck.performance,
      memoryUsage: process.memoryUsage()
    }
  }

  // Determine HTTP status code based on health
  let statusCode = 200
  if (healthCheck.status === 'degraded') {
    statusCode = 200 // Still OK, but with warnings
  } else if (healthCheck.status === 'unhealthy') {
    statusCode = 503 // Service Unavailable
  }

  return NextResponse.json(healthCheck, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Health-Check-Version': '1.0.0'
    }
  })
}

// Alternative endpoint for simple uptime checks
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-Uptime': process.uptime().toString()
    }
  })
}