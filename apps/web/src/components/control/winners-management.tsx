'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Mail,
  Phone,
  Gift,
  Download,
  Bell,
  User,
  Clock,
  DollarSign,
  Loader2,
  Search,
  Copy,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface Winner {
  place: number
  horse_number: number
  participant_id: string
  participant_name: string
  join_code: string
  email: string | null
  phone: string | null
  prize_amount: number
  win_status: string
  notified_at: string | null
  prize_claimed: boolean
  prize_claimed_at: string | null
}

interface WinnersManagementProps {
  event: any
  onDataChange: () => void
}

export function WinnersManagement({ event, onDataChange }: WinnersManagementProps) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null)
  const [showNotifyDialog, setShowNotifyDialog] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [claimingPrize, setClaimingPrize] = useState('')
  const supabase = createClient()

  const filteredWinners = winners.filter(winner =>
    winner.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    winner.join_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    winner.horse_number.toString().includes(searchTerm)
  )

  useEffect(() => {
    loadWinners()
  }, [event.id])

  async function loadWinners() {
    try {
      setLoading(true)

      const { data: winnersData, error } = await supabase
        .rpc('get_event_winners', { event_uuid: event.id })

      if (error) throw error

      setWinners(winnersData || [])
    } catch (error) {
      console.error('Error loading winners:', error)
      toast.error('Failed to load winners')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsNotified(winnerId: string) {
    try {
      setNotifying(true)

      const { error } = await supabase
        .from('patron_entries')
        .update({
          notified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', winnerId)

      if (error) throw error

      toast.success('Winner marked as notified')
      loadWinners()
      onDataChange()
    } catch (error) {
      console.error('Error marking as notified:', error)
      toast.error('Failed to update notification status')
    } finally {
      setNotifying(false)
    }
  }

  async function handleClaimPrize(winnerId: string) {
    try {
      setClaimingPrize(winnerId)

      // Get current user for claimed_by_staff
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('patron_entries')
        .update({
          prize_claimed: true,
          prize_claimed_at: new Date().toISOString(),
          claimed_by_staff: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', winnerId)

      if (error) throw error

      toast.success('Prize marked as claimed')
      loadWinners()
      onDataChange()
    } catch (error) {
      console.error('Error claiming prize:', error)
      toast.error('Failed to mark prize as claimed')
    } finally {
      setClaimingPrize('')
    }
  }

  async function handleBulkNotify() {
    try {
      setNotifying(true)

      const unnotifiedWinners = winners.filter(w => !w.notified_at)

      if (unnotifiedWinners.length === 0) {
        toast.info('All winners have already been notified')
        return
      }

      const { error } = await supabase
        .from('patron_entries')
        .update({
          notified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', unnotifiedWinners.map(w => w.participant_id))

      if (error) throw error

      toast.success(`${unnotifiedWinners.length} winners marked as notified`)
      loadWinners()
      onDataChange()
    } catch (error) {
      console.error('Error bulk notifying:', error)
      toast.error('Failed to notify winners')
    } finally {
      setNotifying(false)
    }
  }

  function handleCopyJoinCode(joinCode: string) {
    navigator.clipboard.writeText(joinCode)
    toast.success('Join code copied to clipboard')
  }

  function handleExportWinners() {
    const csvContent = [
      ['Place', 'Name', 'Join Code', 'Horse Number', 'Email', 'Phone', 'Prize Amount', 'Notified', 'Prize Claimed'],
      ...winners.map(w => [
        w.place,
        w.participant_name,
        w.join_code,
        w.horse_number,
        w.email || '',
        w.phone || '',
        w.prize_amount || 0,
        w.notified_at ? 'Yes' : 'No',
        w.prize_claimed ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.name}-winners.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success('Winners list exported')
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
          <span className="ml-2">Loading winners...</span>
        </CardContent>
      </Card>
    )
  }

  if (winners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Winners</span>
          </CardTitle>
          <CardDescription>
            No winners have been identified yet. Results must be entered first.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Winners will appear here once race results are entered.</p>
        </CardContent>
      </Card>
    )
  }

  const notifiedCount = winners.filter(w => w.notified_at).length
  const claimedCount = winners.filter(w => w.prize_claimed).length
  const totalPrizeValue = winners.reduce((sum, w) => sum + (w.prize_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Winners Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Winners Management</span>
              </CardTitle>
              <CardDescription>
                Manage winner notifications and prize distribution
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {winners.length} Winner{winners.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{notifiedCount}/{winners.length}</div>
              <div className="text-xs text-green-600">Notified</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{claimedCount}/{winners.length}</div>
              <div className="text-xs text-blue-600">Prizes Claimed</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">${totalPrizeValue.toFixed(2)}</div>
              <div className="text-xs text-purple-600">Total Prize Value</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{winners.length - claimedCount}</div>
              <div className="text-xs text-yellow-600">Pending Collection</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleBulkNotify}
              disabled={notifying || notifiedCount === winners.length}
              className="flex-1"
            >
              {notifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Notifying...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Mark All as Notified
                </>
              )}
            </Button>

            <Button
              onClick={handleExportWinners}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Winners List
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`/events/${event.id}/results`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Public Results Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Winners List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="search">Search Winners</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by name, join code, or horse number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredWinners.map((winner) => (
              <div
                key={winner.participant_id}
                className={`p-4 rounded-lg border-2 ${placeColors[winner.place as keyof typeof placeColors] || 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {placeIcons[winner.place as keyof typeof placeIcons]}
                      <span className="font-bold text-lg">
                        {winner.place === 1 ? '1st' : winner.place === 2 ? '2nd' : '3rd'}
                      </span>
                    </div>

                    <div>
                      <div className="font-medium text-lg">{winner.participant_name}</div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Horse #{winner.horse_number}</span>
                        <div className="flex items-center space-x-1">
                          <span>Code: {winner.join_code}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyJoinCode(winner.join_code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {winner.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{winner.email}</span>
                          </div>
                        )}
                        {winner.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{winner.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {winner.prize_amount > 0 && (
                      <div className="text-right">
                        <div className="font-bold text-green-600 text-lg">
                          ${winner.prize_amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">Prize Value</div>
                      </div>
                    )}

                    <div className="flex flex-col space-y-1">
                      {winner.notified_at ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Notified
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsNotified(winner.participant_id)}
                          disabled={notifying}
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          Mark Notified
                        </Button>
                      )}

                      {winner.prize_claimed ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          <Gift className="h-3 w-3 mr-1" />
                          Prize Claimed
                        </Badge>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={claimingPrize === winner.participant_id}
                            >
                              {claimingPrize === winner.participant_id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Claiming...
                                </>
                              ) : (
                                <>
                                  <Gift className="h-3 w-3 mr-1" />
                                  Mark Claimed
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Prize Collection</AlertDialogTitle>
                              <AlertDialogDescription>
                                Mark prize as claimed for <strong>{winner.participant_name}</strong>?
                                <br /><br />
                                <strong>Details:</strong>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Join Code: {winner.join_code}</li>
                                  <li>Place: {winner.place === 1 ? '1st' : winner.place === 2 ? '2nd' : '3rd'}</li>
                                  <li>Prize: ${winner.prize_amount?.toFixed(2) || '0.00'}</li>
                                </ul>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleClaimPrize(winner.participant_id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Confirm Prize Claimed
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>

                {(winner.notified_at || winner.prize_claimed_at) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {winner.notified_at && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Notified: {new Date(winner.notified_at).toLocaleString()}</span>
                        </div>
                      )}
                      {winner.prize_claimed_at && (
                        <div className="flex items-center space-x-1">
                          <Gift className="h-3 w-3" />
                          <span>Claimed: {new Date(winner.prize_claimed_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredWinners.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No winners found matching "{searchTerm}"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}