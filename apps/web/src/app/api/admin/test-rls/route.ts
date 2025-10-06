import { NextRequest, NextResponse } from 'next/server'
import { withApiDefaults } from '@/lib/middleware/error-handler'
import { runRLSTests } from '@/lib/testing/rls-test-suite'

async function handler(request: NextRequest): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    )
  }

  // Only allow in development or with admin authentication
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // In a real implementation, validate the admin token here
    // For now, we'll just check for a basic admin token
    const token = authHeader.substring(7)
    if (token !== process.env.ADMIN_TEST_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid admin token' },
        { status: 403 }
      )
    }
  }

  try {
    console.log('Starting RLS policy tests...')
    const testResults = await runRLSTests()

    const response = {
      success: true,
      data: {
        summary: testResults.summary,
        suites: testResults.suites,
        report: testResults.report,
        timestamp: new Date().toISOString()
      },
      meta: {
        testCount: testResults.summary.totalTests,
        successRate: testResults.summary.successRate,
        duration: testResults.suites.reduce((sum, suite) => sum + suite.duration, 0)
      }
    }

    // Set appropriate status based on test results
    const status = testResults.summary.failed === 0 ? 200 : 206 // 206 = Partial Content (some tests failed)

    return NextResponse.json(response, { status })

  } catch (error) {
    console.error('RLS test execution failed:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to execute RLS tests',
      details: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}

export const POST = withApiDefaults(handler)