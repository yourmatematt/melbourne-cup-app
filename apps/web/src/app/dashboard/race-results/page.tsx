'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Trophy,
  Medal,
  Award,
  Calendar,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  Play,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

interface RaceResult {
  id: string
  race_name: string
  race_date: string
  first_place_horse: number
  second_place_horse: number
  third_place_horse: number
  created_at: string
  summary?: {
    total_events_affected: number
    total_prize_pool_distributed: number
    total_participants_affected: number
  }
}

export default function RaceResultsPage() {
  const [raceDate, setRaceDate] = useState('2025-11-04')
  const [raceName, setRaceName] = useState('2025 Melbourne Cup')
  const [firstPlace, setFirstPlace] = useState('')
  const [secondPlace, setSecondPlace] = useState('')
  const [thirdPlace, setThirdPlace] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [existingResults, setExistingResults] = useState<RaceResult[]>([])
  const [previewResults, setPreviewResults] = useState<any>(null)

  useEffect(() => {
    loadExistingResults()
  }, [])

  async function loadExistingResults() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/race-results')
      const data = await response.json()

      if (data.success) {
        setExistingResults(data.data || [])
      }
    } catch (error) {
      console.error('Error loading race results:', error)
      toast.error('Failed to load existing results')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    // Validation
    if (!firstPlace || !secondPlace || !thirdPlace) {
      toast.error('Please enter all three finishing positions')
      return
    }

    const horses = [parseInt(firstPlace), parseInt(secondPlace), parseInt(thirdPlace)]

    // Check for duplicates
    if (new Set(horses).size !== 3) {
      toast.error('Each position must have a different horse number')
      return
    }

    // Check valid range
    if (horses.some(h => h < 1 || h > 24)) {
      toast.error('Horse numbers must be between 1 and 24')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/race-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          race_name: raceName,
          race_date: raceDate,
          first_place_horse: parseInt(firstPlace),
          second_place_horse: parseInt(secondPlace),
          third_place_horse: parseInt(thirdPlace)
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save race results')
      }

      toast.success(`Race results saved! ${data.data.summary?.total_events_affected || 0} events updated automatically.`)

      // Reset form
      setFirstPlace('')
      setSecondPlace('')
      setThirdPlace('')

      // Reload results
      loadExistingResults()

    } catch (error) {
      console.error('Error saving race results:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save race results')
    } finally {
      setSubmitting(false)
    }
  }

  async function previewImpact() {
    if (!firstPlace || !secondPlace || !thirdPlace) {
      toast.error('Please enter all three positions to preview impact')
      return
    }

    try {
      const response = await fetch('/api/admin/race-results/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          race_date: raceDate,
          first_place_horse: parseInt(firstPlace),
          second_place_horse: parseInt(secondPlace),
          third_place_horse: parseInt(thirdPlace)
        })
      })

      const data = await response.json()

      if (data.success) {
        setPreviewResults(data.data)
        toast.success(`Preview: ${data.data.events_affected} events will be updated`)
      }
    } catch (error) {
      console.error('Error previewing results:', error)
      toast.error('Failed to preview impact')
    }
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  const horseNumbers = Array.from({ length: 24 }, (_, i) => i + 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading race results...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏇 Centralized Race Results
          </h1>
          <p className="text-gray-600 text-lg">
            Enter race results once to automatically calculate prizes for all events
          </p>
        </div>

        {/* Input Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-6 w-6" />
              <span>Enter Race Results</span>
            </CardTitle>
            <CardDescription>
              Input the finishing positions to automatically update all events for this race date
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Race Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="raceName">Race Name</Label>
                <Input
                  id="raceName"
                  value={raceName}
                  onChange={(e) => setRaceName(e.target.value)}
                  placeholder="2025 Melbourne Cup"
                />
              </div>
              <div>
                <Label htmlFor="raceDate">Race Date</Label>
                <Input
                  id="raceDate"
                  type="date"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Finishing Positions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Finishing Positions</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1st Place */}
                <Card className="border-2 border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-800">1st Place</span>
                    </div>
                    <Label htmlFor="firstPlace">Horse Number</Label>
                    <Select value={firstPlace} onValueChange={setFirstPlace}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select horse" />
                      </SelectTrigger>
                      <SelectContent>
                        {horseNumbers.map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            Horse #{num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* 2nd Place */}
                <Card className="border-2 border-gray-200 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Medal className="h-5 w-5 text-gray-600" />
                      <span className="font-semibold text-gray-800">2nd Place</span>
                    </div>
                    <Label htmlFor="secondPlace">Horse Number</Label>
                    <Select value={secondPlace} onValueChange={setSecondPlace}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select horse" />
                      </SelectTrigger>
                      <SelectContent>
                        {horseNumbers.map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            Horse #{num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* 3rd Place */}
                <Card className="border-2 border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Award className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-800">3rd Place</span>
                    </div>
                    <Label htmlFor="thirdPlace">Horse Number</Label>
                    <Select value={thirdPlace} onValueChange={setThirdPlace}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select horse" />
                      </SelectTrigger>
                      <SelectContent>
                        {horseNumbers.map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            Horse #{num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Preview Results */}
            {previewResults && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Impact Preview</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {previewResults.events_affected}
                      </div>
                      <div className="text-sm text-blue-700">Events Affected</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        ${previewResults.total_prize_pool?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-sm text-green-700">Total Prizes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {previewResults.participants_affected}
                      </div>
                      <div className="text-sm text-purple-700">Participants</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={previewImpact}
                variant="outline"
                disabled={!firstPlace || !secondPlace || !thirdPlace}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Impact
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !firstPlace || !secondPlace || !thirdPlace}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving & Calculating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Results & Auto-Calculate All Events
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Results */}
        {existingResults.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Previous Race Results</CardTitle>
              <CardDescription>
                Historical race results and their impact
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {existingResults.map((result) => (
                  <Card key={result.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{result.race_name}</h3>
                          <div className="flex items-center space-x-1 text-gray-600 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDateTime(result.race_date)}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          Completed
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium">1st</span>
                          </div>
                          <Badge variant="outline">#{result.first_place_horse}</Badge>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Medal className="h-4 w-4 text-gray-600" />
                            <span className="font-medium">2nd</span>
                          </div>
                          <Badge variant="outline">#{result.second_place_horse}</Badge>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Award className="h-4 w-4 text-amber-600" />
                            <span className="font-medium">3rd</span>
                          </div>
                          <Badge variant="outline">#{result.third_place_horse}</Badge>
                        </div>
                      </div>

                      {result.summary && (
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">
                              {result.summary.total_events_affected}
                            </div>
                            <div className="text-xs text-gray-600">Events Updated</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">
                              ${result.summary.total_prize_pool_distributed?.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-600">Total Prizes</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-purple-600">
                              {result.summary.total_participants_affected}
                            </div>
                            <div className="text-xs text-gray-600">Participants</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {existingResults.length === 0 && !loading && (
          <Card className="shadow-lg">
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Race Results Yet
              </h3>
              <p className="text-gray-600">
                Enter the first race results to automatically calculate prizes for all events.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}