'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Trophy,
  Medal,
  Award,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Gift,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Share2,
  Copy,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface CheckResult {
  hasResults: boolean
  found?: boolean
  won?: boolean
  participant?: {
    name: string
    joinCode: string
    horseNumber: number
    place: number
    positionText: string
    winStatus: string
    prizeAmount: number
    notified: boolean
    prizeClaimed: boolean
  }
  event: {
    id: string
    name: string
    venue: string
  }
  message: string
}

interface PublicResult {
  place: number
  horseNumber: number
  winnerName: string | null
  prizeAmount: number
  positionText: string
}

export default function PublicResultsPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [joinCode, setJoinCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [publicResults, setPublicResults] = useState<{
    hasResults: boolean
    event: any
    results: PublicResult[]
    winnersCount: number
    totalPrizes: number
  } | null>(null)
  const [loadingResults, setLoadingResults] = useState(true)
  const [showWinnerCard, setShowWinnerCard] = useState(false)

  useEffect(() => {
    loadPublicResults()
  }, [eventId])

  async function loadPublicResults() {
    try {
      setLoadingResults(true)
      const response = await fetch(`/api/events/${eventId}/check-winner`)
      const data = await response.json()

      if (data.success) {
        setPublicResults(data.data)
      }
    } catch (error) {
      console.error('Error loading public results:', error)
    } finally {
      setLoadingResults(false)
    }
  }

  async function handleCheckWinner() {
    if (!joinCode.trim()) {
      toast.error('Please enter your join code')
      return
    }

    setChecking(true)
    try {
      const response = await fetch(`/api/events/${eventId}/check-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.trim() })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to check winner status')
      }

      setResult(data.data)
      setShowWinnerCard(true)

      // Scroll to result
      setTimeout(() => {
        document.getElementById('winner-result')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)

    } catch (error) {
      console.error('Error checking winner:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to check winner status')
    } finally {
      setChecking(false)
    }
  }

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({
        title: `${publicResults?.event.name} Results`,
        text: 'Check the race results and see if you won!',
        url: url
      })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  const placeIcons = {
    1: <Trophy className="h-6 w-6 text-yellow-600" />,
    2: <Medal className="h-6 w-6 text-gray-500" />,
    3: <Award className="h-6 w-6 text-amber-600" />
  }

  const placeColors = {
    1: 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300',
    2: 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300',
    3: 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300'
  }

  if (loadingResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading results...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!publicResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Results Not Available</CardTitle>
            <CardDescription>
              Unable to load event results. Please try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        {/* Event Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {publicResults.event.name}
          </h1>
          <div className="flex items-center justify-center space-x-4 text-gray-600 mb-4">
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>{publicResults.event.venue}</span>
            </div>
            {publicResults.event.startsAt && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDateTime(publicResults.event.startsAt)}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="mb-6"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Results
          </Button>
        </div>

        {/* Winner Check Section */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
              <Search className="h-6 w-6" />
              <span>Check If You Won</span>
            </CardTitle>
            <CardDescription className="text-lg">
              Enter your join code to see your result
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="max-w-md mx-auto">
              <Label htmlFor="joinCode" className="text-base font-medium">
                Your Join Code
              </Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="joinCode"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter your code (e.g., ABC123)"
                  className="text-center font-mono text-lg"
                  maxLength={10}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCheckWinner()
                    }
                  }}
                />
                <Button
                  onClick={handleCheckWinner}
                  disabled={checking || !joinCode.trim()}
                  className="px-8"
                >
                  {checking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Check
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Result Display */}
            {showWinnerCard && result && (
              <div id="winner-result" className="mt-8">
                {result.found ? (
                  <Card className={`shadow-lg border-2 ${
                    result.won
                      ? 'bg-gradient-to-r from-green-50 to-emerald-100 border-green-300'
                      : 'bg-gradient-to-r from-blue-50 to-cyan-100 border-blue-300'
                  }`}>
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-4">
                        {result.won ? (
                          <div className="relative">
                            <Trophy className="h-16 w-16 text-yellow-600" />
                            <Sparkles className="h-8 w-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                          </div>
                        ) : (
                          <CheckCircle className="h-16 w-16 text-blue-600" />
                        )}
                      </div>

                      <CardTitle className={`text-2xl font-bold ${
                        result.won ? 'text-green-800' : 'text-blue-800'
                      }`}>
                        {result.message}
                      </CardTitle>

                      {result.participant && (
                        <CardDescription className="text-lg mt-2">
                          <div className="space-y-2">
                            <div>
                              <strong>Participant:</strong> {result.participant.name}
                            </div>
                            <div>
                              <strong>Horse #{result.participant.horseNumber}</strong> finished <strong>{result.participant.positionText}</strong>
                            </div>
                          </div>
                        </CardDescription>
                      )}
                    </CardHeader>

                    {result.won && result.participant && (
                      <CardContent>
                        <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-green-600">
                                {result.participant.positionText.toUpperCase()}
                              </div>
                              <div className="text-sm text-green-700">Your Finish</div>
                            </div>

                            {result.participant.prizeAmount > 0 && (
                              <div className="text-center">
                                <div className="text-3xl font-bold text-green-600">
                                  ${result.participant.prizeAmount.toFixed(2)}
                                </div>
                                <div className="text-sm text-green-700">Prize Value</div>
                              </div>
                            )}
                          </div>

                          <Separator className="my-4" />

                          <div className="space-y-3">
                            <h3 className="font-semibold text-green-800">🎉 Congratulations! Here's what to do next:</h3>
                            <ul className="space-y-2 text-sm text-green-700">
                              <li className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4" />
                                <span>Visit {result.event.venue} to collect your prize</span>
                              </li>
                              <li className="flex items-center space-x-2">
                                <Copy className="h-4 w-4" />
                                <span>Show this join code: <strong className="font-mono">{result.participant.joinCode}</strong></span>
                              </li>
                              <li className="flex items-center space-x-2">
                                <Gift className="h-4 w-4" />
                                <span>Bring valid ID for prize collection</span>
                              </li>
                            </ul>

                            {result.participant.prizeClaimed && (
                              <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-200">
                                <div className="text-sm text-blue-700 font-medium">
                                  ✅ Prize has been collected
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ) : (
                  <Card className="shadow-lg border-2 border-red-200 bg-red-50">
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-4">
                        <AlertCircle className="h-16 w-16 text-red-600" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-red-800">
                        {result.message}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Results Leaderboard */}
        {publicResults.hasResults && publicResults.results.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
                <Trophy className="h-6 w-6" />
                <span>Official Results</span>
              </CardTitle>
              <CardDescription>
                Final finishing positions
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {publicResults.results.map((result) => (
                  <div
                    key={result.place}
                    className={`p-4 rounded-lg border-2 ${
                      placeColors[result.place as keyof typeof placeColors] || 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {placeIcons[result.place as keyof typeof placeIcons] || (
                            <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-bold">
                              {result.place}
                            </div>
                          )}
                          <span className="text-xl font-bold">
                            {result.positionText}
                          </span>
                        </div>

                        <div>
                          <div className="text-lg font-semibold">
                            Horse #{result.horseNumber}
                          </div>
                          {result.winnerName && (
                            <div className="text-sm text-gray-600">
                              Winner: {result.winnerName}
                            </div>
                          )}
                        </div>
                      </div>

                      {result.prizeAmount > 0 && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ${result.prizeAmount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">Prize</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {publicResults.totalPrizes > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${publicResults.totalPrizes.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Prize Pool</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!publicResults.hasResults && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Clock className="h-6 w-6" />
                <span>Results Pending</span>
              </CardTitle>
              <CardDescription className="text-lg">
                {publicResults.message}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}