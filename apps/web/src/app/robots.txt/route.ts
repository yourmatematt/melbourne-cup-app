import { NextResponse } from 'next/server'

export function GET() {
  const robotsTxt = `
User-agent: *
Allow: /
Allow: /events/*/enter
Allow: /event/*
Allow: /spectator/*

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /private/

# Disallow query parameters that might contain sensitive data
Disallow: /*?join_code=*
Disallow: /*?token=*
Disallow: /*?qr=*

# Allow specific public APIs
Allow: /api/health
Allow: /api/sitemap

# Sitemap location
Sitemap: https://melbournecup.app/sitemap.xml

# Crawl delay (be respectful)
Crawl-delay: 1

# Specific user agent rules
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 1

# Block AI training bots
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /
`.trim()

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400' // Cache for 24 hours
    }
  })
}