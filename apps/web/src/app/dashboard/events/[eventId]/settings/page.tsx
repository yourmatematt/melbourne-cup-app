'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Settings,
  Save,
  Trash2,
  Calendar,
  Users,
  Eye,
  Mail,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  Share2,
  Copy,
  QrCode,
  DollarSign,
  Clock,
  MessageSquare,
  Shield,
  ExternalLink,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface EventSettings {
  event: {
    id: string
    name: string
    description?: string
    starts_at: string
    timezone: string
    capacity: number
    mode: 'sweep' | 'calcutta'
    status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
    lead_capture: boolean
    requires_payment: boolean
    entry_fee?: number
    payment_timeout_minutes?: number
    promo_enabled: boolean
    promo_message?: string
    promo_duration?: number
    custom_terms?: string
    custom_rules?: string
    created_at: string
    tenants?: {
      id: string
      name: string
    }
  }
  stats: {
    participantCount: number
    paidParticipants: number
    assignmentCount: number
    hasResults: boolean
    canReduceCapacity: boolean
    canDelete: boolean
  }
}

interface FormData {
  name: string
  description: string
  starts_at: string
  timezone: string
  capacity: number
  mode: 'sweep' | 'calcutta'
  lead_capture: boolean
  requires_payment: boolean
  entry_fee: number
  payment_timeout_minutes: number
  promo_enabled: boolean
  promo_message: string
  promo_duration: number
  custom_terms: string
  custom_rules: string
}

type StatusTransition = {
  from: string
  to: string
  label: string
  description: string
  variant: 'default' | 'destructive' | 'secondary'
}

export default function EventSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    starts_at: '',
    timezone: 'Australia/Melbourne',
    capacity: 100,
    mode: 'sweep',
    lead_capture: true,
    requires_payment: false,
    entry_fee: 0,
    payment_timeout_minutes: 30,
    promo_enabled: false,
    promo_message: '',
    promo_duration: 0,
    custom_terms: '',
    custom_rules: ''
  })

  useEffect(() => {
    if (eventId) {
      loadEventSettings()
    }
  }, [eventId])

  async function loadEventSettings() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/events/${eventId}/settings`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load event settings')
      }

      const settings = data.data
      setEventSettings(settings)

      // Populate form with current values
      setFormData({
        name: settings.event.name || '',
        description: settings.event.description || '',
        starts_at: settings.event.starts_at ? new Date(settings.event.starts_at).toISOString().slice(0, 16) : '',
        timezone: settings.event.timezone || 'Australia/Melbourne',
        capacity: settings.event.capacity || 100,
        mode: settings.event.mode || 'sweep',
        lead_capture: settings.event.lead_capture || false,
        requires_payment: settings.event.requires_payment || false,
        entry_fee: settings.event.entry_fee || 0,
        payment_timeout_minutes: settings.event.payment_timeout_minutes || 30,
        promo_enabled: settings.event.promo_enabled || false,
        promo_message: settings.event.promo_message || '',
        promo_duration: settings.event.promo_duration || 0,
        custom_terms: settings.event.custom_terms || '',
        custom_rules: settings.event.custom_rules || ''
      })

      setHasUnsavedChanges(false)

    } catch (err) {
      console.error('Error loading event settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!eventSettings || !formData.name.trim()) {
      toast.error('Event name is required')
      return
    }

    setSaving(true)
    try {
      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : undefined,
        timezone: formData.timezone,
        capacity: formData.capacity,
        mode: formData.mode,
        lead_capture: formData.lead_capture,
        requires_payment: formData.requires_payment,
        entry_fee: formData.requires_payment ? formData.entry_fee : undefined,
        payment_timeout_minutes: formData.requires_payment ? formData.payment_timeout_minutes : undefined,
        promo_enabled: formData.promo_enabled,
        promo_message: formData.promo_enabled ? formData.promo_message : undefined,
        promo_duration: formData.promo_enabled ? formData.promo_duration : undefined,
        custom_terms: formData.custom_terms.trim() || undefined,
        custom_rules: formData.custom_rules.trim() || undefined
      }

      const response = await fetch(`/api/events/${eventId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save event settings')
      }

      toast.success('Event settings saved successfully')
      setHasUnsavedChanges(false)
      await loadEventSettings() // Refresh data

    } catch (err) {
      console.error('Error saving event settings:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save event settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: string, reason?: string) {
    if (!eventSettings) return

    setStatusChanging(true)
    try {
      const response = await fetch(`/api/events/${eventId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update event status')
      }

      toast.success(`Event status changed to ${newStatus}`)
      await loadEventSettings() // Refresh data

    } catch (err) {
      console.error('Error changing status:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setStatusChanging(false)
    }
  }

  async function handleDelete() {
    if (!eventSettings || deleteConfirmName !== eventSettings.event.name) {
      toast.error('Please type the exact event name to confirm deletion')
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/settings?confirm=${encodeURIComponent(deleteConfirmName)}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete event')
      }

      toast.success('Event deleted successfully')
      router.push('/dashboard')

    } catch (err) {
      console.error('Error deleting event:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  function updateFormData(field: keyof FormData, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  function getJoinUrl() {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin
      return `${baseUrl}/events/${eventId}/enter`
    }
    return ''
  }

  function getResultsUrl() {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin
      return `${baseUrl}/events/${eventId}/results`
    }
    return ''
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard!`)
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'drawing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-purple-100 text-purple-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function getAvailableStatusTransitions(): StatusTransition[] {
    if (!eventSettings) return []

    const currentStatus = eventSettings.event.status
    const transitions: StatusTransition[] = []

    switch (currentStatus) {
      case 'draft':
        transitions.push(
          { from: 'draft', to: 'active', label: 'Activate Event', description: 'Make event live for participants', variant: 'default' },
          { from: 'draft', to: 'cancelled', label: 'Cancel Event', description: 'Cancel this event', variant: 'destructive' }
        )
        break
      case 'active':
        transitions.push(
          { from: 'active', to: 'drawing', label: 'Start Drawing', description: 'Begin the draw process', variant: 'default' },
          { from: 'active', to: 'completed', label: 'Complete Event', description: 'Mark event as completed', variant: 'secondary' },
          { from: 'active', to: 'cancelled', label: 'Cancel Event', description: 'Cancel this event', variant: 'destructive' }
        )
        break
      case 'drawing':
        transitions.push(
          { from: 'drawing', to: 'completed', label: 'Complete Event', description: 'Finish the event', variant: 'default' },
          { from: 'drawing', to: 'active', label: 'Return to Active', description: 'Go back to active status', variant: 'secondary' }
        )
        break
      case 'cancelled':
        transitions.push(
          { from: 'cancelled', to: 'draft', label: 'Reactivate', description: 'Restore to draft status', variant: 'default' }
        )
        break
    }

    return transitions
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading event settings...</p>
        </div>
      </div>
    )
  }

  if (error || !eventSettings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error || 'Event not found'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const event = eventSettings.event
  const stats = eventSettings.stats

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/dashboard/events/${eventId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Event
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Event Settings</h1>
                <p className="text-gray-600">{event.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Unsaved Changes
                </Badge>
              )}
              <Badge className={getStatusColor(event.status)}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Configuration</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center space-x-2">
              <Share2 className="h-4 w-4" />
              <span>Status & Sharing</span>
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Danger Zone</span>
            </TabsTrigger>
          </TabsList>

          {/* GENERAL DETAILS TAB */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>General Details</span>
                </CardTitle>
                <CardDescription>
                  Basic event information and descriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Event Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="Melbourne Cup 2025"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="mode">Event Mode</Label>
                    <Select value={formData.mode} onValueChange={(value) => updateFormData('mode', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sweep">Sweep</SelectItem>
                        <SelectItem value="calcutta">Calcutta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Event Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Event description for participants..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="starts_at">Start Date & Time</Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) => updateFormData('starts_at', e.target.value)}
                      className="mt-1"
                    />
                    {event.starts_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {formatDateTime(event.starts_at)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={formData.timezone} onValueChange={(value) => updateFormData('timezone', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                        <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                        <SelectItem value="Australia/Brisbane">Australia/Brisbane</SelectItem>
                        <SelectItem value="Australia/Adelaide">Australia/Adelaide</SelectItem>
                        <SelectItem value="Australia/Perth">Australia/Perth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Content</CardTitle>
                <CardDescription>
                  Additional terms and rules for participants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="custom_terms">Custom Terms & Conditions</Label>
                  <Textarea
                    id="custom_terms"
                    value={formData.custom_terms}
                    onChange={(e) => updateFormData('custom_terms', e.target.value)}
                    placeholder="Additional terms and conditions..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="custom_rules">Custom Rules</Label>
                  <Textarea
                    id="custom_rules"
                    value={formData.custom_rules}
                    onChange={(e) => updateFormData('custom_rules', e.target.value)}
                    placeholder="Event-specific rules..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONFIGURATION TAB */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Participation Settings</span>
                </CardTitle>
                <CardDescription>
                  Manage participant limits and data collection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="capacity">Participant Limit</Label>
                      <p className="text-xs text-gray-500">Maximum number of participants allowed</p>
                    </div>
                    <div className="text-right">
                      <Input
                        id="capacity"
                        type="number"
                        min="1"
                        max="500"
                        value={formData.capacity}
                        onChange={(e) => updateFormData('capacity', e.target.value === '' ? 100 : parseInt(e.target.value) || 100)}
                        placeholder="100"
                        className="w-24 text-center"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center space-x-4 text-sm">
                    <span className="text-gray-500">
                      Current participants: <span className="font-medium">{stats?.participantCount || 0}</span>
                    </span>
                    {!stats.canReduceCapacity && (
                      <span className="text-amber-600 flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Cannot reduce below current participants</span>
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lead Capture</Label>
                    <p className="text-xs text-gray-500">Collect email addresses for marketing</p>
                  </div>
                  <Switch
                    checked={formData.lead_capture}
                    onCheckedChange={(checked) => updateFormData('lead_capture', checked)}
                  />
                </div>

                {formData.lead_capture && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      When enabled, participants can opt-in to receive marketing communications during registration.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Payment Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure entry fees and payment options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Payment</Label>
                    <p className="text-xs text-gray-500">Collect entry fees from participants</p>
                  </div>
                  <Switch
                    checked={formData.requires_payment}
                    onCheckedChange={(checked) => updateFormData('requires_payment', checked)}
                  />
                </div>

                {formData.requires_payment && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                        <Input
                          id="entry_fee"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.entry_fee === 0 ? '' : formData.entry_fee}
                          onChange={(e) => updateFormData('entry_fee', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="payment_timeout">Payment Timeout (minutes)</Label>
                        <Input
                          id="payment_timeout"
                          type="number"
                          min="5"
                          max="120"
                          value={formData.payment_timeout_minutes === 30 && formData.payment_timeout_minutes === 0 ? '' : formData.payment_timeout_minutes}
                          onChange={(e) => updateFormData('payment_timeout_minutes', e.target.value === '' ? 30 : parseInt(e.target.value) || 30)}
                          placeholder="30"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-700">
                        Payment processing requires additional setup and compliance. Contact support for more information.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Promotional Messages</span>
                </CardTitle>
                <CardDescription>
                  Display promotional content to participants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Promotional Messages</Label>
                    <p className="text-xs text-gray-500">Show promotional content during event</p>
                  </div>
                  <Switch
                    checked={formData.promo_enabled}
                    onCheckedChange={(checked) => updateFormData('promo_enabled', checked)}
                  />
                </div>

                {formData.promo_enabled && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="promo_message">Promotional Message</Label>
                      <Textarea
                        id="promo_message"
                        value={formData.promo_message}
                        onChange={(e) => updateFormData('promo_message', e.target.value)}
                        placeholder="Your promotional message..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="promo_duration">Display Duration (seconds)</Label>
                      <Input
                        id="promo_duration"
                        type="number"
                        min="0"
                        max="300"
                        value={formData.promo_duration === 0 ? '' : formData.promo_duration}
                        onChange={(e) => updateFormData('promo_duration', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Set to 0 to show until manually dismissed
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* STATUS & SHARING TAB */}
          <TabsContent value="status" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Event Status</span>
                </CardTitle>
                <CardDescription>
                  Manage event lifecycle and status transitions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Current Status</Label>
                    <p className="text-xs text-gray-500">Event is currently {event.status}</p>
                  </div>
                  <Badge className={getStatusColor(event.status)}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </div>

                <Separator />

                <div>
                  <Label>Status Actions</Label>
                  <p className="text-xs text-gray-500 mb-3">Available status transitions</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getAvailableStatusTransitions().map((transition) => (
                      <Button
                        key={transition.to}
                        variant={transition.variant}
                        onClick={() => handleStatusChange(transition.to)}
                        disabled={statusChanging}
                        className="justify-start"
                      >
                        {statusChanging ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        {transition.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Event Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{stats?.participantCount || 0}</div>
                      <div className="text-blue-700">Participants</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{stats.paidParticipants}</div>
                      <div className="text-green-700">Paid</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{stats.assignmentCount}</div>
                      <div className="text-purple-700">Assignments</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{stats.hasResults ? 'Yes' : 'No'}</div>
                      <div className="text-orange-700">Results</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Share2 className="h-5 w-5" />
                  <span>Sharing & URLs</span>
                </CardTitle>
                <CardDescription>
                  Event URLs for participants and public access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Join URL</Label>
                  <p className="text-xs text-gray-500 mb-2">Direct link for participants to join</p>
                  <div className="flex space-x-2">
                    <Input
                      value={getJoinUrl()}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getJoinUrl(), 'Join URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={getJoinUrl()} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Results URL</Label>
                  <p className="text-xs text-gray-500 mb-2">Public results page</p>
                  <div className="flex space-x-2">
                    <Input
                      value={getResultsUrl()}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getResultsUrl(), 'Results URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={getResultsUrl()} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start" asChild>
                    <Link href={`/dashboard/events/${eventId}/qr`}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate QR Code
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start" asChild>
                    <Link href={`/dashboard/events/${eventId}/print/participants`}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Participants
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DANGER ZONE TAB */}
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription className="text-red-600">
                  Irreversible actions that will permanently affect your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-white border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">Delete Event</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Permanently delete this event and all associated data. This action cannot be undone.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="delete_confirm">Type event name to confirm deletion:</Label>
                      <Input
                        id="delete_confirm"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder={event.name}
                        className="mt-1"
                      />
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={deleteConfirmName !== event.name || deleting}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Event Permanently
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Event: {event.name}</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>All participant entries ({stats?.participantCount || 0} participants)</li>
                              <li>All horse assignments and draw results</li>
                              <li>All event data and settings</li>
                              <li>All results and winner information</li>
                            </ul>
                            <p className="mt-3 font-semibold text-red-600">
                              This action cannot be undone.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleting}
                          >
                            {deleting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              'Yes, Delete Permanently'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {!stats.canDelete && (
                    <div className="mt-3 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                      <p className="text-sm text-amber-800">
                        This event cannot be deleted because it has participants or processed payments.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Actions Bar */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {hasUnsavedChanges && (
                  <div className="flex items-center space-x-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">You have unsaved changes</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      loadEventSettings() // Reset form
                    }
                  }}
                  disabled={saving || !hasUnsavedChanges}
                >
                  {hasUnsavedChanges ? 'Discard Changes' : 'Cancel'}
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim() || !stats.canReduceCapacity}
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  )
}