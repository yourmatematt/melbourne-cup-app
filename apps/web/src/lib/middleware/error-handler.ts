import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { validateInput, ApiResponse } from '@/lib/validations'

// Error types for classification
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  CAPACITY = 'CAPACITY_ERROR',
  NETWORK = 'NETWORK_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL = 'INTERNAL_ERROR'
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: any

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message)
    this.type = type
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION, 400, true, details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorType.AUTHENTICATION, 401, true)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorType.AUTHORIZATION, 403, true)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, ErrorType.NOT_FOUND, 404, true)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONFLICT, 409, true, details)
  }
}

export class CapacityError extends AppError {
  constructor(message: string = 'Resource at capacity') {
    super(message, ErrorType.CAPACITY, 409, true)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, ErrorType.RATE_LIMIT, 429, true)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.DATABASE, 500, true, details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `External service ${service} is unavailable`, ErrorType.EXTERNAL_SERVICE, 502, true)
  }
}

// Error handler middleware
export function withErrorHandler<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse<ApiResponse<T>>> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleError(error, request)
    }
  }
}

// Main error handling function
export function handleError(error: unknown, request?: NextRequest): NextResponse<ApiResponse> {
  console.error('API Error:', error)

  // Handle known error types
  if (error instanceof AppError) {
    return createErrorResponse(
      error.message,
      error.statusCode,
      error.type,
      error.details
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))

    return createErrorResponse(
      'Validation failed',
      400,
      ErrorType.VALIDATION,
      { validationErrors }
    )
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    return handleSupabaseError(error as any)
  }

  // Handle network/fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createErrorResponse(
      'Network error occurred',
      502,
      ErrorType.NETWORK
    )
  }

  // Handle generic JavaScript errors
  if (error instanceof Error) {
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An internal error occurred'
      : error.message

    return createErrorResponse(
      message,
      500,
      ErrorType.INTERNAL,
      process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
    )
  }

  // Unknown error type
  return createErrorResponse(
    'An unexpected error occurred',
    500,
    ErrorType.INTERNAL
  )
}

// Handle specific Supabase errors
function handleSupabaseError(error: any): NextResponse<ApiResponse> {
  const { code, message, details, hint } = error

  switch (code) {
    case 'PGRST116': // No rows returned
      return createErrorResponse('Resource not found', 404, ErrorType.NOT_FOUND)

    case '23505': // Unique constraint violation
      return createErrorResponse('Duplicate entry', 409, ErrorType.CONFLICT, { hint })

    case '23503': // Foreign key constraint violation
      return createErrorResponse('Referenced resource not found', 400, ErrorType.VALIDATION, { hint })

    case '42501': // Insufficient privileges
      return createErrorResponse('Insufficient permissions', 403, ErrorType.AUTHORIZATION)

    case 'PGRST301': // JWT expired
      return createErrorResponse('Session expired', 401, ErrorType.AUTHENTICATION)

    case 'PGRST300': // JWT invalid
      return createErrorResponse('Invalid authentication token', 401, ErrorType.AUTHENTICATION)

    case '08006': // Connection failure
    case '57P03': // Cannot connect now
      return createErrorResponse('Database connection error', 503, ErrorType.DATABASE)

    case '53300': // Too many connections
      return createErrorResponse('Service temporarily unavailable', 503, ErrorType.DATABASE)

    // Custom application errors
    case 'CAPACITY_EXCEEDED':
      return createErrorResponse('Event is at capacity', 409, ErrorType.CAPACITY)

    case 'EVENT_CLOSED':
      return createErrorResponse('Event is no longer accepting participants', 409, ErrorType.CONFLICT)

    case 'DRAW_ALREADY_EXECUTED':
      return createErrorResponse('Draw has already been executed', 409, ErrorType.CONFLICT)

    case 'INVALID_EVENT_STATE':
      return createErrorResponse('Event is not in a valid state for this operation', 409, ErrorType.CONFLICT)

    default:
      return createErrorResponse(
        message || 'Database error occurred',
        500,
        ErrorType.DATABASE,
        { code, details, hint }
      )
  }
}

// Create standardized error response
function createErrorResponse(
  message: string,
  statusCode: number,
  type: ErrorType,
  details?: any
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: message,
    meta: {
      timestamp: new Date().toISOString(),
      type,
      ...(details && { details })
    }
  }

  return NextResponse.json(response, { status: statusCode })
}

// Validation middleware
export function withValidation<T>(
  schema: any,
  handler: (request: NextRequest, validatedData: T, context?: any) => Promise<NextResponse>
) {
  return withErrorHandler(async (request: NextRequest, context?: any) => {
    let body: any

    try {
      body = await request.json()
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body')
    }

    const validation = validateInput(schema, body)

    if (!validation.success) {
      throw new ValidationError('Request validation failed', validation.errors)
    }

    return handler(request, validation.data as T, context)
  })
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000, // 1 minute
  keyGenerator?: (request: NextRequest) => string
) {
  return function<T>(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
  ) {
    return withErrorHandler(async (request: NextRequest, context?: any) => {
      const key = keyGenerator?.(request) || getClientIP(request) || 'anonymous'
      const now = Date.now()
      const windowStart = now - windowMs

      // Clean up old entries
      for (const [rateLimitKey, data] of rateLimitMap.entries()) {
        if (data.resetTime < windowStart) {
          rateLimitMap.delete(rateLimitKey)
        }
      }

      const current = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs }

      if (current.count >= maxRequests && current.resetTime > now) {
        throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((current.resetTime - now) / 1000)} seconds`)
      }

      current.count++
      rateLimitMap.set(key, current)

      const response = await handler(request, context)

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - current.count).toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString())

      return response
    })
  }
}

// Authentication middleware
export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withErrorHandler(async (request: NextRequest, context?: any) => {
    const authorization = request.headers.get('authorization')

    if (!authorization) {
      throw new AuthenticationError('Authorization header required')
    }

    const token = authorization.replace('Bearer ', '')

    if (!token) {
      throw new AuthenticationError('Invalid authorization token')
    }

    // Validate token (implement your JWT validation logic here)
    // For now, we'll just check if it exists
    if (token.length < 10) {
      throw new AuthenticationError('Invalid token format')
    }

    return handler(request, context)
  })
}

// Helper functions
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return realIP || cfConnectingIP || null
}

// Request logging middleware
export function withLogging(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now()
    const requestId = Math.random().toString(36).substring(2)

    console.log(`[${requestId}] ${request.method} ${request.url} - Started`)

    try {
      const response = await handler(request, context)
      const duration = Date.now() - startTime

      console.log(`[${requestId}] ${request.method} ${request.url} - ${response.status} (${duration}ms)`)

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      console.error(`[${requestId}] ${request.method} ${request.url} - Error (${duration}ms):`, error)

      throw error
    }
  }
}

// Combine multiple middlewares
export function withMiddleware<T = any>(
  ...middlewares: Array<(handler: any) => any>
) {
  return function(handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>) {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

// Common middleware combinations
export const withApiDefaults = withMiddleware(
  withLogging,
  withErrorHandler
)

export const withAuthAndValidation = <T>(schema: any) => withMiddleware(
  withLogging,
  withAuth,
  (handler: any) => withValidation<T>(schema, handler)
)

export const withPublicRateLimit = withMiddleware(
  withLogging,
  withRateLimit(50, 60000), // 50 requests per minute for public endpoints
  withErrorHandler
)