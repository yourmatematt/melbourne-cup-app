'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Table components inline since they don't exist in UI
const Table = ({ children, className = '', ...props }: any) => (
  <div className={`w-full overflow-auto ${className}`} {...props}>
    <table className="w-full caption-bottom text-sm">
      {children}
    </table>
  </div>
)

const TableHeader = ({ children, ...props }: any) => (
  <thead className="[&_tr]:border-b" {...props}>
    {children}
  </thead>
)

const TableBody = ({ children, ...props }: any) => (
  <tbody className="[&_tr:last-child]:border-0" {...props}>
    {children}
  </tbody>
)

const TableRow = ({ children, className = '', ...props }: any) => (
  <tr className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`} {...props}>
    {children}
  </tr>
)

const TableHead = ({ children, className = '', ...props }: any) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`} {...props}>
    {children}
  </th>
)

const TableCell = ({ children, className = '', ...props }: any) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props}>
    {children}
  </td>
)
import { Plus, Calendar, Users, Clock, Play, Trophy, Eye, Settings, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface Event {
  id: string
  name: string
  status: 'active' | 'drawing' | 'completed' | 'cancelled'
  starts_at: string
  capacity: number
  created_at: string
  participant_count?: number
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
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

      // Get user's tenant ID
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantError) throw tenantError

      // Fetch events for this tenant
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', tenantUser.tenant_id)
        .order('created_at', { ascending: false })

      if (eventsError) throw eventsError

      // Get participant counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from('patron_entries')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)

          return {
            ...event,
            participant_count: count || 0
          }
        })
      )

      setEvents(eventsWithCounts)

    } catch (err) {
      console.error('Error loading events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="gap-1 bg-green-500"><Play className="h-3 w-3" />Active</Badge>
      case 'completed':
        return <Badge variant="default" className="gap-1 bg-yellow-500"><Trophy className="h-3 w-3" />Completed</Badge>
      case 'drawing':
        return <Badge variant="default" className="gap-1 bg-blue-500"><Play className="h-3 w-3" />Drawing</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading events...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadEvents}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
            <p className="mt-2 text-gray-600">
              Manage your Melbourne Cup sweeps and calcuttas
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Button>
          </Link>
        </div>

        {events.length === 0 ? (
          /* Empty state */
          <Card>
            <CardHeader>
              <CardTitle>No Events Yet</CardTitle>
              <CardDescription>
                Create your first Melbourne Cup event to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/events/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Events Table */
          <Card>
            <CardHeader>
              <CardTitle>Your Events</CardTitle>
              <CardDescription>
                {events.length} event{events.length !== 1 ? 's' : ''} total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="hover:underline text-blue-600"
                        >
                          {event.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(event.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          {event.participant_count} / {event.capacity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(event.starts_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(event.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/events/${event.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Event
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/events/${event.id}/settings`}>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(`/events/${event.id}/live`, '_blank')}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Live View
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}