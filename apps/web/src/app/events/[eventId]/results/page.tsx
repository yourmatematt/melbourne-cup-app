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
  horseName: string | null
  prizeAmount: number
  positionText: string
  status: string
  collected: boolean
}

interface ResultsData {
  hasResults: boolean
  event: {
    id: string
    name: string
    venue: string
    startsAt: string
  }
  results: PublicResult[]
  allParticipants: Array<{
    place: number | null
    horseNumber: number
    horseName: string | null
    participantName: string | null
    status: string
    prizeAmount: number
    collected: boolean
  }>
  summary: {
    totalParticipants: number
    winnersCount: number
    totalPrizes: number
    prizesDistributed: number
  }
}

export default function PublicResultsPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [joinCode, setJoinCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [publicResults, setPublicResults] = useState<ResultsData | null>(null)
  const [loadingResults, setLoadingResults] = useState(true)
  const [showWinnerCard, setShowWinnerCard] = useState(false)

  useEffect(() => {
    loadPublicResults()
  }, [eventId])

  async function loadPublicResults() {
    try {
      setLoadingResults(true)
      const response = await fetch(`/api/events/${eventId}/results`)
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

        {/* Results Display matching Figma design */}
        {publicResults.hasResults && publicResults.results.length > 0 && (
          <div className="space-y-6">
            {/* Winner Hero Card */}
            {publicResults.results[0] && (
              <Card className="shadow-xl border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 p-8 text-white text-center relative">
                  <div className="absolute top-4 right-4">
                    <Trophy className="h-8 w-8 text-yellow-300" />
                  </div>
                  <div className="mb-4">
                    <h2 className="text-3xl font-bold mb-2">
                      {publicResults.results[0].winnerName || `Horse #${publicResults.results[0].horseNumber}`}
                    </h2>
                    <div className="text-lg opacity-90 mb-1">
                      FIRST PLACE WINNER
                    </div>
                    <div className="text-sm opacity-75">
                      Horse ({publicResults.results[0].horseNumber}) - {publicResults.results[0].horseName || 'Victory'}
                    </div>
                  </div>
                  <div className="text-4xl font-bold">
                    ${publicResults.results[0].prizeAmount.toFixed(2)}
                  </div>
                </div>
              </Card>
            )}

            {/* Runner-up Cards */}
            {publicResults.results.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {publicResults.results.slice(1, 4).map((result, index) => (
                  <Card key={result.place} className="shadow-lg border border-gray-200">
                    <CardContent className="p-6 text-center">
                      <div className="mb-4">
                        {result.place === 2 && <Medal className="h-8 w-8 text-gray-500 mx-auto mb-2" />}
                        {result.place === 3 && <Award className="h-8 w-8 text-amber-600 mx-auto mb-2" />}
                        {result.place > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-bold mx-auto mb-2">
                            {result.place}
                          </div>
                        )}
                      </div>
                      <div className="text-lg font-semibold mb-1">
                        {result.winnerName || `Horse #${result.horseNumber}`}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {result.positionText}
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        ${result.prizeAmount.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Full Results Table */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Race Results</span>
                  <Button variant="outline" size="sm">
                    Export Results
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600">Position</th>
                        <th className="text-left p-4 font-medium text-gray-600">Horse #</th>
                        <th className="text-left p-4 font-medium text-gray-600">Horse Name</th>
                        <th className="text-left p-4 font-medium text-gray-600">Participant</th>
                        <th className="text-center p-4 font-medium text-gray-600">Status</th>
                        <th className="text-right p-4 font-medium text-gray-600">Prize</th>
                      </tr>
                    </thead>
                    <tbody>
                      {publicResults.allParticipants?.map((participant, index) => (
                        <tr key={`${participant.horseNumber}-${index}`} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {participant.place && participant.place <= 3 ? (
                                <>
                                  {participant.place === 1 && <Trophy className="h-4 w-4 text-yellow-600" />}
                                  {participant.place === 2 && <Medal className="h-4 w-4 text-gray-500" />}
                                  {participant.place === 3 && <Award className="h-4 w-4 text-amber-600" />}
                                  <span className="font-medium">{participant.place}</span>
                                </>
                              ) : (
                                <span className="text-gray-400">{participant.place || '—'}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="font-mono">
                              {participant.horseNumber}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">
                              {participant.horseName || 'VICTORY BILLINGMORE'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {participant.participantName?.charAt(0) || 'H'}
                                </span>
                              </div>
                              <span>{participant.participantName || 'No assignment'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              variant={participant.place ? 'default' : 'secondary'}
                              className={participant.place ? 'bg-green-100 text-green-800' : ''}
                            >
                              {participant.place ? 'Finished' : 'Finished'}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">
                            {participant.prizeAmount > 0 ? (
                              <span className="text-green-600">
                                ${participant.prizeAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">$0.00</span>
                            )}
                          </td>
                        </tr>
                      )) || publicResults.results.map((result, index) => (
                        <tr key={result.place} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {result.place <= 3 ? (
                                <>
                                  {result.place === 1 && <Trophy className="h-4 w-4 text-yellow-600" />}
                                  {result.place === 2 && <Medal className="h-4 w-4 text-gray-500" />}
                                  {result.place === 3 && <Award className="h-4 w-4 text-amber-600" />}
                                  <span className="font-medium">{result.place}</span>
                                </>
                              ) : (
                                <span className="text-gray-400">{result.place}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="font-mono">
                              {result.horseNumber}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">
                              {result.horseName || 'VICTORY BILLINGMORE'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {result.winnerName?.charAt(0) || 'H'}
                                </span>
                              </div>
                              <span>{result.winnerName || 'No assignment'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Finished
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">
                            {result.prizeAmount > 0 ? (
                              <span className="text-green-600">
                                ${result.prizeAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">$0.00</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Prize Distribution Summary */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Prize Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${publicResults.summary?.totalPrizes?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">Total Pool</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${(publicResults.summary?.prizesDistributed || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Prize Pool</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {publicResults.summary?.winnersCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">Prizes Yet</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {publicResults.summary?.totalParticipants || 0}
                    </div>
                    <div className="text-sm text-gray-600">Winners Notified</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!publicResults.hasResults && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Clock className="h-6 w-6" />
                <span>Results Pending</span>
              </CardTitle>
              <CardDescription className="text-lg">
                Results will be available once the race has finished and been processed.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}