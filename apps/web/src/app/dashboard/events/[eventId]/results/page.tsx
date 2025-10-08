'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Trophy, Crown, Medal, Award, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Event = {
  id: string
  name: string
  starts_at: string
  status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
}

type Assignment = {
  event_horse_id: string
  patron_entry_id: string
  patron_entries: {
    participant_name: string
  }
  event_horses: {
    number: number
    name: string
  }
}

type Result = {
  id: string
  place: number
  event_horse_id: string | null
  patron_entry_id: string | null
  prize_amount: number | null
  collected: boolean
  collected_at: string | null
  patron_entries: {
    participant_name: string
  } | null
  event_horses: {
    number: number
    name: string
  } | null
}

export default function ResultsPage() {
  const [event, setEvent] = useState<Event | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [firstPlace, setFirstPlace] = useState('')
  const [secondPlace, setSecondPlace] = useState('')
  const [thirdPlace, setThirdPlace] = useState('')
  const [prizePool, setPrizePool] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const eventId = params.eventId as string

  useEffect(() => {
    if (eventId) {
      fetchData()
    }
  }, [eventId])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        router.push('/login')
        return
      }

      // Get user's tenant ID first
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantError) throw tenantError

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, starts_at, status')
        .eq('id', eventId)
        .eq('tenant_id', tenantUser.tenant_id)
        .single()

      if (eventError) throw eventError
      setEvent(eventData)

      // Fetch assignments (horses with assigned patrons)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          event_horse_id,
          patron_entry_id,
          patron_entries!patron_entry_id (
            participant_name
          ),
          event_horses!event_horse_id (
            number,
            name
          )
        `)
        .eq('event_id', eventId)
        .order('event_horses(number)')

      if (assignmentsError) throw assignmentsError
      setAssignments(assignmentsData || [])

      // Fetch existing results
      const { data: resultsData, error: resultsError } = await supabase
        .from('event_results')
        .select(`
          id,
          place,
          event_horse_id,
          patron_entry_id,
          prize_amount,
          collected,
          collected_at,
          patron_entries!patron_entry_id (
            participant_name
          ),
          event_horses!event_horse_id (
            number,
            name
          )
        `)
        .eq('event_id', eventId)
        .order('place')

      if (resultsError) throw resultsError
      setResults(resultsData || [])

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!firstPlace || !secondPlace || !thirdPlace || !prizePool) {
      setError('Please fill in all fields')
      return
    }

    const prizeAmount = parseFloat(prizePool)
    if (isNaN(prizeAmount) || prizeAmount <= 0) {
      setError('Prize pool must be a valid positive number')
      return
    }

    // Check for duplicate selections
    const selections = [firstPlace, secondPlace, thirdPlace]
    if (new Set(selections).size !== 3) {
      setError('Please select different horses for each place')
      return
    }

    setShowConfirmDialog(true)
  }

  async function saveResults() {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/events/${eventId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first: firstPlace,
          second: secondPlace,
          third: thirdPlace,
          prizePool: parseFloat(prizePool)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save results')
      }

      // Refresh data
      await fetchData()
      setShowConfirmDialog(false)

      // Clear form
      setFirstPlace('')
      setSecondPlace('')
      setThirdPlace('')
      setPrizePool('')

    } catch (err) {
      console.error('Error saving results:', err)
      setError(err instanceof Error ? err.message : 'Failed to save results')
    } finally {
      setSaving(false)
    }
  }

  async function markAsCollected(resultId: string) {
    try {
      const response = await fetch(`/api/events/${eventId}/results/${resultId}/collect`, {
        method: 'PATCH',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark as collected')
      }

      // Refresh results
      await fetchData()

    } catch (err) {
      console.error('Error marking as collected:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark as collected')
    }
  }

  function calculatePrizeAmounts() {
    const amount = parseFloat(prizePool)
    if (isNaN(amount) || amount <= 0) return { first: 0, second: 0, third: 0 }

    return {
      first: Math.round(amount * 0.6),
      second: Math.round(amount * 0.25),
      third: Math.round(amount * 0.15)
    }
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading results...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href={`/dashboard/events/${eventId}`}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Event
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchData}>Try Again</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const prizeAmounts = calculatePrizeAmounts()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/dashboard/events/${eventId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Race Results</h1>
              {event && (
                <p className="text-gray-600 mt-1">
                  {event.name} • {formatDateTime(event.starts_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {results.length === 0 ? (
          /* Results Entry Form */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Enter Race Results
              </CardTitle>
              <CardDescription>
                Record the Melbourne Cup race results and set the prize pool distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Prize Pool */}
                  <div className="space-y-2">
                    <Label htmlFor="prizePool">Total Prize Pool ($)</Label>
                    <Input
                      id="prizePool"
                      type="number"
                      placeholder="1000"
                      value={prizePool}
                      onChange={(e) => setPrizePool(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Prize Distribution Preview */}
                  <div className="space-y-2">
                    <Label>Prize Distribution</Label>
                    <div className="text-sm space-y-1 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between">
                        <span>1st Place (60%):</span>
                        <span className="font-medium">{formatCurrency(prizeAmounts.first)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>2nd Place (25%):</span>
                        <span className="font-medium">{formatCurrency(prizeAmounts.second)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>3rd Place (15%):</span>
                        <span className="font-medium">{formatCurrency(prizeAmounts.third)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Place Selections */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Select Winning Horses</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* First Place */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        1st Place - {formatCurrency(prizeAmounts.first)}
                      </Label>
                      <Select value={firstPlace} onValueChange={setFirstPlace}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select horse" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignments.map((assignment) => (
                            <SelectItem key={assignment.event_horse_id} value={assignment.event_horse_id}>
                              Horse #{assignment.event_horses.number} - {assignment.event_horses.name}
                              <br />
                              <span className="text-xs text-gray-500">
                                Owner: {assignment.patron_entries.participant_name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Second Place */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Medal className="h-4 w-4 text-gray-400" />
                        2nd Place - {formatCurrency(prizeAmounts.second)}
                      </Label>
                      <Select value={secondPlace} onValueChange={setSecondPlace}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select horse" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignments.map((assignment) => (
                            <SelectItem key={assignment.event_horse_id} value={assignment.event_horse_id}>
                              Horse #{assignment.event_horses.number} - {assignment.event_horses.name}
                              <br />
                              <span className="text-xs text-gray-500">
                                Owner: {assignment.patron_entries.participant_name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Third Place */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-600" />
                        3rd Place - {formatCurrency(prizeAmounts.third)}
                      </Label>
                      <Select value={thirdPlace} onValueChange={setThirdPlace}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select horse" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignments.map((assignment) => (
                            <SelectItem key={assignment.event_horse_id} value={assignment.event_horse_id}>
                              Horse #{assignment.event_horses.number} - {assignment.event_horses.name}
                              <br />
                              <span className="text-xs text-gray-500">
                                Owner: {assignment.patron_entries.participant_name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Trophy className="mr-2 h-4 w-4" />
                    Declare Winners
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Results Display */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Race Winners
              </CardTitle>
              <CardDescription>
                Melbourne Cup results and prize collection status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result) => {
                  const PlaceIcon = result.place === 1 ? Crown : result.place === 2 ? Medal : Award
                  const iconColor = result.place === 1 ? 'text-yellow-500' : result.place === 2 ? 'text-gray-400' : 'text-amber-600'

                  return (
                    <div
                      key={result.id}
                      className={`p-4 border rounded-lg ${
                        result.place === 1 ? 'bg-yellow-50 border-yellow-200' :
                        result.place === 2 ? 'bg-gray-50 border-gray-200' :
                        'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <PlaceIcon className={`h-6 w-6 ${iconColor}`} />
                          <div>
                            <h3 className="font-medium">
                              {result.place === 1 ? '1st' : result.place === 2 ? '2nd' : '3rd'} Place
                            </h3>
                            {result.event_horses && (
                              <p className="text-sm text-gray-600">
                                Horse #{result.event_horses.number} - {result.event_horses.name}
                              </p>
                            )}
                            {result.patron_entries && (
                              <p className="text-sm text-gray-500">
                                Owner: {result.patron_entries.participant_name}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-medium text-lg">
                            {result.prize_amount ? formatCurrency(result.prize_amount) : 'No prize'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {result.collected ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">
                                  Collected {result.collected_at ? new Date(result.collected_at).toLocaleDateString() : ''}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-orange-600">
                                  <Clock className="h-4 w-4" />
                                  <span className="text-sm">Uncollected</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsCollected(result.id)}
                                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                >
                                  Mark Collected
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Race Results</DialogTitle>
              <DialogDescription>
                Please confirm the race results. This will mark the event as completed and notify all participants.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">1st Place - {formatCurrency(prizeAmounts.first)}</span>
                </div>
                {firstPlace && (
                  <p className="text-sm text-gray-600 ml-6">
                    {assignments.find(a => a.event_horse_id === firstPlace)?.event_horses.name}
                    {' - '}
                    {assignments.find(a => a.event_horse_id === firstPlace)?.patron_entries.participant_name}
                  </p>
                )}
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Medal className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">2nd Place - {formatCurrency(prizeAmounts.second)}</span>
                </div>
                {secondPlace && (
                  <p className="text-sm text-gray-600 ml-6">
                    {assignments.find(a => a.event_horse_id === secondPlace)?.event_horses.name}
                    {' - '}
                    {assignments.find(a => a.event_horse_id === secondPlace)?.patron_entries.participant_name}
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-amber-600" />
                  <span className="font-medium">3rd Place - {formatCurrency(prizeAmounts.third)}</span>
                </div>
                {thirdPlace && (
                  <p className="text-sm text-gray-600 ml-6">
                    {assignments.find(a => a.event_horse_id === thirdPlace)?.event_horses.name}
                    {' - '}
                    {assignments.find(a => a.event_horse_id === thirdPlace)?.patron_entries.participant_name}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveResults} disabled={saving}>
                {saving ? 'Saving...' : 'Confirm Results'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}