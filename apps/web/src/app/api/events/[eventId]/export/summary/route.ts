import { NextRequest, NextResponse } from 'next/server'

// PDF generation endpoint - temporarily disabled
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'PDF export feature is currently under development'
    },
    { status: 501 }
  )
}