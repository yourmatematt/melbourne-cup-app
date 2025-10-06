import { NextRequest } from 'next/server'

// Simple in-memory rate limiting for development
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Initialize Redis for production rate limiting (disabled for now)
const redis = null

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: NextRequest) => string
  message?: string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

class RateLimiter {
  private fallbackStore = new Map<string, { count: number; resetTime: number }>()

  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - config.windowMs

    try {
      if (redis) {
        return await this.checkRedisLimit(key, config, now, windowStart)
      } else {
        return this.checkMemoryLimit(key, config, now, windowStart)
      }
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Fallback to memory-based limiting
      return this.checkMemoryLimit(key, config, now, windowStart)
    }
  }

  private async checkRedisLimit(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult> {
    const windowKey = `ratelimit:${key}:${Math.floor(now / config.windowMs)}`

    // Use Redis pipeline for atomic operations
    const pipeline = redis!.pipeline()
    pipeline.incr(windowKey)
    pipeline.expire(windowKey, Math.ceil(config.windowMs / 1000))

    const results = await pipeline.exec()
    const count = results[0] as number

    const resetTime = now + config.windowMs
    const remaining = Math.max(0, config.maxRequests - count)
    const success = count <= config.maxRequests

    return {
      success,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: success ? undefined : Math.ceil(config.windowMs / 1000)
    }
  }

  private checkMemoryLimit(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): RateLimitResult {
    // Clean up expired entries
    for (const [storeKey, data] of this.fallbackStore.entries()) {
      if (data.resetTime < now) {
        this.fallbackStore.delete(storeKey)
      }
    }

    const windowKey = `${key}:${Math.floor(now / config.windowMs)}`
    const current = this.fallbackStore.get(windowKey) || {
      count: 0,
      resetTime: now + config.windowMs
    }

    current.count++
    this.fallbackStore.set(windowKey, current)

    const remaining = Math.max(0, config.maxRequests - current.count)
    const success = current.count <= config.maxRequests

    return {
      success,
      limit: config.maxRequests,
      remaining,
      resetTime: current.resetTime,
      retryAfter: success ? undefined : Math.ceil((current.resetTime - now) / 1000)
    }
  }
}

const rateLimiter = new RateLimiter()

// Default rate limit configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Public API endpoints
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests from this IP'
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts'
  },

  // Patron join endpoints
  join: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many join attempts'
  },

  // Admin endpoints
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    message: 'Admin rate limit exceeded'
  },

  // Draw operations
  draw: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Draw operation rate limit exceeded'
  },

  // File uploads
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Upload rate limit exceeded'
  }
} as const

// Helper function to extract client identifier
export function getClientId(request: NextRequest): string {
  // Try to get user ID from auth header
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    try {
      // In a real implementation, decode the JWT and extract user ID
      const token = authHeader.replace('Bearer ', '')
      // For now, use a hash of the token
      return `user:${token.slice(0, 16)}`
    } catch (error) {
      // Fall through to IP-based limiting
    }
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  const ip = forwarded?.split(',')[0].trim() || realIp || cfConnectingIp || 'unknown'
  return `ip:${ip}`
}

// Middleware factory for rate limiting
export function createRateLimit(configName: keyof typeof RATE_LIMIT_CONFIGS) {
  const config = RATE_LIMIT_CONFIGS[configName]

  return async function rateLimit(request: NextRequest): Promise<{
    success: boolean
    headers: Record<string, string>
    error?: string
  }> {
    const clientId = config.keyGenerator?.(request) || getClientId(request)
    const key = `${configName}:${clientId}`

    const result = await rateLimiter.checkLimit(key, config)

    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    }

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString()
    }

    return {
      success: result.success,
      headers,
      error: result.success ? undefined : config.message
    }
  }
}

// Rate limiting middleware for Next.js API routes
export function withRateLimit(
  configName: keyof typeof RATE_LIMIT_CONFIGS,
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
    const rateLimit = createRateLimit(configName)
    const result = await rateLimit(request)

    // Create response with rate limit headers
    if (!result.success) {
      const response = new Response(
        JSON.stringify({
          error: result.error,
          retryAfter: result.headers['Retry-After']
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...result.headers
          }
        }
      )
      return response
    }

    // Call the original handler
    const response = await handler(request, ...args)

    // Add rate limit headers to successful responses
    Object.entries(result.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

// CORS configuration
export const CORS_CONFIG = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://melbournecup.app', 'https://www.melbournecup.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
}

// CORS middleware
export function withCORS(
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
    const origin = request.headers.get('origin')

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin':
            CORS_CONFIG.origin.includes(origin || '') ? origin! : 'null',
          'Access-Control-Allow-Methods': CORS_CONFIG.methods.join(', '),
          'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders.join(', '),
          'Access-Control-Allow-Credentials': CORS_CONFIG.credentials.toString(),
          'Access-Control-Max-Age': CORS_CONFIG.maxAge.toString(),
        }
      })
    }

    // Call the original handler
    const response = await handler(request, ...args)

    // Add CORS headers to response
    if (CORS_CONFIG.origin.includes(origin || '')) {
      response.headers.set('Access-Control-Allow-Origin', origin!)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    return response
  }
}

// Combined middleware for API routes
export function withAPIDefaults(
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>,
  rateLimitConfig: keyof typeof RATE_LIMIT_CONFIGS = 'public'
) {
  return withCORS(withRateLimit(rateLimitConfig, handler))
}