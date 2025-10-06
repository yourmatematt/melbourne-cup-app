import { NextRequest, NextResponse } from 'next/server'
import { withAPIDefaults } from '@/lib/middleware/rate-limit'
import crypto from 'crypto'

interface QRSignRequest {
  eventId: string
  timestamp: number
  url: string
}

async function handler(request: NextRequest): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    )
  }

  try {
    const body: QRSignRequest = await request.json()
    const { eventId, timestamp, url } = body

    // Validate input
    if (!eventId || !timestamp || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check timestamp is reasonable (within 1 hour of now)
    const now = Date.now()
    const timeDiff = Math.abs(now - timestamp)
    const maxTimeDiff = 60 * 60 * 1000 // 1 hour

    if (timeDiff > maxTimeDiff) {
      return NextResponse.json(
        { error: 'Invalid timestamp' },
        { status: 400 }
      )
    }

    // Create payload to sign
    const payload = `${eventId}:${timestamp}:${url}`

    // Sign with HMAC-SHA256
    const secret = process.env.QR_CODE_SECRET || 'default-secret-change-in-production'
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return NextResponse.json({
      signature,
      payload,
      timestamp: now
    })

  } catch (error) {
    console.error('QR signing error:', error)
    return NextResponse.json(
      { error: 'Failed to sign QR code data' },
      { status: 500 }
    )
  }
}

export const POST = withAPIDefaults(handler, 'public')