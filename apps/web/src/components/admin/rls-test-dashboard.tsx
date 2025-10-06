'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  RefreshCw,
  Database,
  Users,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface RLSTestResult {
  testName: string
  operation: string
  table: string
  passed: boolean
  error?: string
  details?: any
}

interface RLSTestSuite {
  suiteName: string
  results: RLSTestResult[]
  passed: number
  failed: number
  duration: number
}

interface TestSummary {
  totalTests: number
  passed: number
  failed: number
  successRate: number
}

export function RLSTestDashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<{
    suites: RLSTestSuite[]
    summary: TestSummary
    report: string
    timestamp: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runTests = async () => {
    setIsRunning(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/test-rls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In development, no auth required
          // In production, would include admin token
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Test execution failed')
      }

      setTestResults(data.data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run tests'
      setError(errorMessage)
    } finally {
      setIsRunning(false)
    }
  }

  const downloadReport = () => {
    if (!testResults?.report) return

    const blob = new Blob([testResults.report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rls-test-report-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    )
  }

  const getOperationColor = (operation: string) => {
    switch (operation.toUpperCase()) {
      case 'SELECT':
        return 'bg-blue-100 text-blue-800'
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <span>RLS Policy Testing</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Validate Row Level Security policies across all database tables
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {testResults && (
            <Button
              variant="outline"
              onClick={downloadReport}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </Button>
          )}

          <Button
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{isRunning ? 'Running Tests...' : 'Run RLS Tests'}</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setError(null)}
                    className="h-6 px-2 text-xs"
                  >
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium">Running RLS Policy Tests</p>
                    <p className="text-sm text-gray-600">
                      Testing security policies across all database tables...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Results */}
      <AnimatePresence>
        {testResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{testResults.summary.totalTests}</p>
                      <p className="text-sm text-gray-600">Total Tests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">{testResults.summary.passed}</p>
                      <p className="text-sm text-gray-600">Passed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-600">{testResults.summary.failed}</p>
                      <p className="text-sm text-gray-600">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {testResults.summary.successRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">Success Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Overall Test Results</span>
                    <span>{testResults.summary.passed}/{testResults.summary.totalTests}</span>
                  </div>
                  <Progress
                    value={testResults.summary.successRate}
                    className="h-3"
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Last run: {new Date(testResults.timestamp).toLocaleString()}</span>
                    <Badge
                      variant={testResults.summary.failed === 0 ? 'default' : 'destructive'}
                    >
                      {testResults.summary.failed === 0 ? 'All Tests Passed' : `${testResults.summary.failed} Failed`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Suites */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Detailed Results</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4">
                  {testResults.suites.map((suite, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center space-x-2">
                            <Shield className="w-5 h-5" />
                            <span>{suite.suiteName}</span>
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={suite.failed === 0 ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {suite.passed}/{suite.results.length}
                            </Badge>
                            <span className="text-xs text-gray-500">{suite.duration}ms</span>
                          </div>
                        </div>
                        <CardDescription>
                          {suite.failed === 0
                            ? 'All security policies are working correctly'
                            : `${suite.failed} policy violations detected`
                          }
                        </CardDescription>
                      </CardHeader>

                      <CardContent>
                        <div className="space-y-2">
                          <Progress
                            value={(suite.passed / suite.results.length) * 100}
                            className="h-2"
                          />
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>{suite.passed} passed</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span>{suite.failed} failed</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {testResults.suites.map((suite, suiteIndex) => (
                  <Card key={suiteIndex}>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center space-x-2">
                              <Shield className="w-5 h-5" />
                              <span>{suite.suiteName}</span>
                            </CardTitle>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={suite.failed === 0 ? 'default' : 'destructive'}
                              >
                                {suite.passed}/{suite.results.length}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-3">
                            {suite.results.map((result, resultIndex) => (
                              <div
                                key={resultIndex}
                                className={`p-3 rounded-lg border ${
                                  result.passed
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-red-200 bg-red-50'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3">
                                    {getStatusIcon(result.passed)}
                                    <div>
                                      <p className="font-medium text-sm">{result.testName}</p>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className={`text-xs ${getOperationColor(result.operation)}`}
                                        >
                                          {result.operation}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {result.table}
                                        </Badge>
                                      </div>
                                      {result.error && (
                                        <p className="text-xs text-red-700 mt-2">
                                          Error: {result.error}
                                        </p>
                                      )}
                                      {result.details && (
                                        <p className="text-xs text-gray-600 mt-1">
                                          {JSON.stringify(result.details)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {!testResults && !isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>About RLS Testing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Row Level Security (RLS) policies ensure that users can only access data they're
              authorized to see. This test suite validates that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>Admins can access all data across tenants</li>
              <li>Hosts can only access their own tenant's data</li>
              <li>Patrons can only access their own entries and public event information</li>
              <li>Sensitive operations are properly restricted</li>
              <li>Audit logs maintain proper access controls</li>
            </ul>
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Run these tests regularly to ensure your database security policies are working
                correctly. Failed tests indicate potential security vulnerabilities.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}