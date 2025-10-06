import { NextRequest, NextResponse } from 'next/server'

// Security headers configuration
const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline'
      https://app.posthog.com
      https://js.sentry-cdn.com
      https://browser.sentry-cdn.com
      https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline'
      https://fonts.googleapis.com
      https://cdn.jsdelivr.net;
    font-src 'self'
      https://fonts.gstatic.com
      data:;
    img-src 'self'
      https:
      data:
      blob:
      https://app.posthog.com;
    media-src 'self'
      https:
      data:
      blob:;
    connect-src 'self'
      https://*.supabase.co
      https://app.posthog.com
      wss://*.supabase.co
      https://*.sentry.io
      https://vitals.vercel-insights.com;
    frame-src 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\\s+/g, ' ').trim(),

  // Strict Transport Security (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection
  'X-XSS-Protection': '1; mode=block',

  // Frame Options
  'X-Frame-Options': 'DENY',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy
  'Permissions-Policy': `
    camera=(),
    microphone=(),
    geolocation=(),
    interest-cohort=(),
    payment=(),
    usb=(),
    magnetometer=(),
    accelerometer=(),
    gyroscope=()
  `.replace(/\\s+/g, ' ').trim(),

  // Disable DNS prefetching
  'X-DNS-Prefetch-Control': 'off',

  // Disable download prompt
  'X-Download-Options': 'noopen',

  // Prevent search engine indexing of sensitive content
  'X-Robots-Tag': 'index, follow, noarchive, nosnippet'
}

// Rate limiting store (simple in-memory for middleware)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function cleanupRateLimit() {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

function rateLimit(request: NextRequest, maxRequests: number = 100, windowMs: number = 60000): boolean {
  cleanupRateLimit()

  const ip = getClientIP(request)
  const key = `${ip}:${Math.floor(Date.now() / windowMs)}`

  const current = rateLimitStore.get(key) || { count: 0, resetTime: Date.now() + windowMs }
  current.count++
  rateLimitStore.set(key, current)

  return current.count <= maxRequests
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Apply security headers to all requests
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    // Different rate limits for different API endpoints
    let maxRequests = 100
    let windowMs = 60000

    if (pathname.startsWith('/api/auth/')) {
      maxRequests = 5 // Stricter for auth endpoints
      windowMs = 15 * 60 * 1000 // 15 minutes
    } else if (pathname.startsWith('/api/admin/')) {
      maxRequests = 200 // Higher for admin endpoints
    } else if (pathname.startsWith('/api/patron/')) {
      maxRequests = 20 // Moderate for patron endpoints
    } else if (pathname.startsWith('/api/public/')) {
      maxRequests = 50 // Lower for public endpoints
    }

    if (!rateLimit(request, maxRequests, windowMs)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(windowMs / 1000).toString(),
            ...securityHeaders
          }
        }
      )
    }

    // Add rate limit headers
    const resetTime = Math.ceil((Date.now() + windowMs) / 1000)
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Reset', resetTime.toString())
  }

  // CORS handling for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://melbournecup.app', 'https://www.melbournecup.app']
      : ['http://localhost:3000', 'http://127.0.0.1:3000']

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, { status: 200 })

      if (origin && allowedOrigins.includes(origin)) {
        preflightResponse.headers.set('Access-Control-Allow-Origin', origin)
        preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true')
      }

      preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      preflightResponse.headers.set('Access-Control-Max-Age', '86400')

      // Apply security headers to preflight responses too
      Object.entries(securityHeaders).forEach(([key, value]) => {
        preflightResponse.headers.set(key, value)
      })

      return preflightResponse
    }

    // Add CORS headers to actual API responses
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
  }

  // Block access to sensitive files
  if (
    pathname.includes('/.env') ||
    pathname.includes('/.git') ||
    pathname.includes('/node_modules/') ||
    pathname.includes('/.next/') ||
    pathname.endsWith('.log') ||
    pathname.endsWith('.bak') ||
    pathname.endsWith('.sql')
  ) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Admin route protection (basic - should be enhanced with proper auth)
  if (pathname.startsWith('/admin/')) {
    // In production, this should check for proper authentication
    // For now, we'll just add extra security headers
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  }

  // Set cache headers for static assets
  if (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/icons/') ||
    pathname.match(/\\.(jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|eot)$/)
  ) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  // Set cache headers for API responses
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/health') {
      response.headers.set('Cache-Control', 'no-cache')
    } else if (pathname.startsWith('/api/public/')) {
      response.headers.set('Cache-Control', 'public, max-age=300') // 5 minutes
    } else {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    }
  }

  // Security headers for pages
  if (!pathname.startsWith('/api/')) {
    // Prevent caching of pages with sensitive data
    if (pathname.startsWith('/admin/') || pathname.includes('/patron/')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    } else {
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300') // 5 minutes
    }
  }

  // Add request ID for tracing
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-ID', requestId)

  // Add timing headers
  response.headers.set('X-Timestamp', new Date().toISOString())

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}