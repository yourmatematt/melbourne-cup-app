'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Trophy,
  Medal,
  Award,
  Check,
  Lock,
  Unlock,
  AlertCircle,
  Calendar,
  Users,
  DollarSign,
  Save,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface ResultEntry {
  place: number
  horseNumber: number | null
  prizeAmount: number | null
}

interface Assignment {
  id: string
  horse_number: number
  patron_entries: {
    display_name: string
    join_code: string
  }
  event_horses: {
    name: string
    jockey: string
  }
}

interface Winner {
  place: number
  horse_number: number
  participant_name: string
  join_code: string
  email: string
  phone: string
  prize_amount: number
  win_status: string
  notified_at: string | null
  prize_claimed: boolean
}

interface ResultsEntryProps {
  event: any
  onDataChange: () => void
}

export function ResultsEntry({ event, onDataChange }: ResultsEntryProps) {
  const [results, setResults] = useState<ResultEntry[]>([
    { place: 1, horseNumber: null, prizeAmount: null },
    { place: 2, horseNumber: null, prizeAmount: null },
    { place: 3, horseNumber: null, prizeAmount: null }
  ])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [currentResults, setCurrentResults] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const supabase = createClient()

  const canEdit = event.results_status !== 'final'
  const hasResults = currentResults?.results && currentResults.results.length > 0
  const isFinalized = event.results_status === 'final'

  useEffect(() => {
    loadData()
  }, [event.id])

  async function loadData() {
    try {
      setLoading(true)

      // Load assignments to populate horse selector
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id,
          horse_number,
          patron_entries (
            display_name,
            join_code
          ),
          event_horses (
            name,
            jockey
          )
        `)
        .eq('event_id', event.id)
        .order('horse_number', { ascending: true })

      if (assignmentsError) throw assignmentsError
      setAssignments(assignmentsData || [])

      // Load current results
      const response = await fetch(`/api/events/${event.id}/results`)
      const data = await response.json()

      if (data.success) {
        setCurrentResults(data.data)
        setWinners(data.data.winners || [])
        setSummary(data.data.summary)

        // Populate form with existing results
        if (data.data.results && data.data.results.length > 0) {
          const existingResults = data.data.results.map((r: any) => ({
            place: r.place,
            horseNumber: r.horse_number,
            prizeAmount: r.prize_amount
          }))
          setResults(existingResults)
        }
      }
    } catch (error) {
      console.error('Error loading results data:', error)
      toast.error('Failed to load results data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveResults(finalize = false) {
    const validResults = results.filter(r => r.horseNumber !== null)

    if (validResults.length === 0) {
      toast.error('Please enter at least one result')
      return
    }

    // Validate no duplicate horses
    const horseNumbers = validResults.map(r => r.horseNumber)
    const uniqueHorses = new Set(horseNumbers)
    if (horseNumbers.length !== uniqueHorses.size) {
      toast.error('Each horse can only be selected once')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/events/${event.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: validResults.map(r => ({
            place: r.place,
            horseNumber: r.horseNumber,
            prizeAmount: r.prizeAmount || 0
          })),
          finalize
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save results')
      }

      toast.success(finalize ? 'Results saved and finalized!' : 'Results saved successfully')

      setWinners(data.data.winners || [])
      setCurrentResults(data.data)

      if (finalize) {
        event.results_status = 'final'
      }

      onDataChange()
    } catch (error) {
      console.error('Error saving results:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save results')
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalizeToggle(finalize: boolean) {
    setFinalizing(true)
    try {
      const response = await fetch(`/api/events/${event.id}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalize })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to ${finalize ? 'finalize' : 'unlock'} results`)
      }

      toast.success(data.data.message)
      event.results_status = finalize ? 'final' : 'pending'
      onDataChange()
    } catch (error) {
      console.error('Error finalizing results:', error)
      toast.error(error instanceof Error ? error.message : 'Operation failed')
    } finally {
      setFinalizing(false)
    }
  }

  function updateResult(place: number, field: keyof Omit<ResultEntry, 'place'>, value: any) {
    setResults(prev => prev.map(r =>
      r.place === place
        ? { ...r, [field]: value === '' ? null : value }
        : r
    ))
  }

  function getParticipantForHorse(horseNumber: number) {
    return assignments.find(a => a.horse_number === horseNumber)
  }

  const placeIcons = {
    1: <Trophy className="h-5 w-5 text-yellow-600" />,
    2: <Medal className="h-5 w-5 text-gray-500" />,
    3: <Award className="h-5 w-5 text-amber-600" />
  }

  const placeColors = {
    1: 'bg-yellow-50 border-yellow-200',
    2: 'bg-gray-50 border-gray-200',
    3: 'bg-amber-50 border-amber-200'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading results...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Race Results</span>
              </CardTitle>
              <CardDescription>
                Enter the finishing positions for {event.name}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isFinalized ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Lock className="h-3 w-3 mr-1" />
                  Finalized
                </Badge>
              ) : hasResults ? (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Draft
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {summary && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{summary.total_participants}</div>
                <div className="text-xs text-blue-600">Total Participants</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{summary.winners_count}</div>
                <div className="text-xs text-green-600">Winners</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">{summary.prizes_unclaimed}</div>
                <div className="text-xs text-yellow-600">Unclaimed Prizes</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{summary.prizes_claimed}</div>
                <div className="text-xs text-purple-600">Prizes Claimed</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Finishing Positions</CardTitle>
          <CardDescription>
            Select the horse numbers that finished in 1st, 2nd, and 3rd place
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {results.map((result) => (
            <div key={result.place} className={`p-4 rounded-lg border-2 ${placeColors[result.place as keyof typeof placeColors] || 'bg-gray-50 border-gray-200'}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label className="flex items-center space-x-2 text-base font-medium">
                    {placeIcons[result.place as keyof typeof placeIcons]}
                    <span>{result.place === 1 ? '1st' : result.place === 2 ? '2nd' : '3rd'} Place</span>
                  </Label>
                  <Select
                    value={result.horseNumber?.toString() || ''}
                    onValueChange={(value) => updateResult(result.place, 'horseNumber', parseInt(value))}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select horse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.map((assignment) => {
                        const isSelected = results.some(r => r.horseNumber === assignment.horse_number && r.place !== result.place)
                        return (
                          <SelectItem
                            key={assignment.id}
                            value={assignment.horse_number.toString()}
                            disabled={isSelected}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold">#{assignment.horse_number}</span>
                              <span>{assignment.event_horses.name}</span>
                              {isSelected && <Badge variant="outline" className="text-xs">Selected</Badge>}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  {result.horseNumber && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <div className="text-sm">
                        <div className="font-medium">{getParticipantForHorse(result.horseNumber)?.patron_entries.display_name}</div>
                        <div className="text-gray-500">
                          Code: {getParticipantForHorse(result.horseNumber)?.patron_entries.join_code}
                        </div>
                        <div className="text-gray-500">
                          Jockey: {getParticipantForHorse(result.horseNumber)?.event_horses.jockey}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor={`prize-${result.place}`}>Prize Amount ($)</Label>
                  <Input
                    id={`prize-${result.place}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={result.prizeAmount || ''}
                    onChange={(e) => updateResult(result.place, 'prizeAmount', parseFloat(e.target.value))}
                    placeholder="0.00"
                    disabled={!canEdit}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  {result.horseNumber && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}

          {canEdit && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => handleSaveResults(false)}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Results
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="default"
                    disabled={saving || !hasResults}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Save & Finalize
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalize Race Results</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to finalize these results? Once finalized, the results will be locked and cannot be changed without administrator intervention.
                      <br /><br />
                      This will:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Lock the results from further editing</li>
                        <li>Automatically identify all winners</li>
                        <li>Make results visible to participants</li>
                        <li>Enable winner notifications</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleSaveResults(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Finalize Results
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {isFinalized && (
            <div className="flex justify-center pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={finalizing}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {finalizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Unlocking...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Unlock Results for Editing
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlock Results</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to unlock these finalized results? This will allow editing but may cause confusion if participants have already been notified.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleFinalizeToggle(false)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Unlock Results
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Winners Preview */}
      {winners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Identified Winners ({winners.length})</span>
            </CardTitle>
            <CardDescription>
              Participants who will be notified of their wins
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {winners.map((winner) => (
                <div key={`${winner.place}-${winner.horse_number}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {placeIcons[winner.place as keyof typeof placeIcons]}
                    <div>
                      <div className="font-medium">{winner.participant_name}</div>
                      <div className="text-sm text-gray-500">
                        Horse #{winner.horse_number} • Code: {winner.join_code}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {winner.prize_amount > 0 && (
                      <div className="font-medium text-green-600">
                        ${winner.prize_amount.toFixed(2)}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      {winner.place === 1 ? '1st Place' : winner.place === 2 ? '2nd Place' : '3rd Place'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}