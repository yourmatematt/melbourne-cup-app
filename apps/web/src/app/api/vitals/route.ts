import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const metric = JSON.parse(body)

    // Log Core Web Vitals metric
    console.log('Core Web Vitals:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      url: request.headers.get('referer') || 'unknown',
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    })

    // In production, you might want to send this to an analytics service
    // Analytics.track('web-vital', metric)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to log web vital:', error)
    return NextResponse.json({ error: 'Failed to log metric' }, { status: 400 })
  }
}