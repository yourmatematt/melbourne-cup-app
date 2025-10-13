'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
  Download,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  LayoutDashboard,
  Building
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

  // Accordion state
  const [openSection, setOpenSection] = useState<string | null>('general')

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
      case 'drawing': return 'bg-violet-100 text-violet-700 border-violet-500'
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

  function toggleSection(sectionId: string) {
    setOpenSection(prev => prev === sectionId ? null : sectionId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading event settings...</p>
        </div>
      </div>
    )
  }

  if (error || !eventSettings) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-6 w-full max-w-md">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error || 'Event not found'}</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const event = eventSettings.event
  const stats = eventSettings.stats

  return (
    <div className="bg-[#f8f7f4] min-h-screen flex">
      {/* Left Sidebar */}
      <div className="bg-white border-r border-[rgba(0,0,0,0.08)] w-[256px] h-screen flex flex-col">
        {/* Logo Section */}
        <div className="border-b border-[rgba(0,0,0,0.08)] h-[89px] px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] w-8 h-8 rounded-lg"></div>
            <div>
              <h2 className="font-['Arial:Bold',_sans-serif] text-[16px] text-slate-900">MelbourneCupSweep</h2>
              <p className="font-['Arial:Regular',_sans-serif] text-[12px] text-slate-600">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-4">
          <div className="space-y-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start h-12 px-4 text-slate-600 hover:bg-gray-50">
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start h-12 px-4 text-slate-600 hover:bg-gray-50">
              <Building className="w-5 h-5 mr-3" />
              Venue Settings
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[rgba(0,0,0,0.08)] px-4 py-4">
          <p className="font-['Arial:Regular',_sans-serif] text-[12px] text-slate-600">© 2025 MelbourneCupSweep</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/events/${eventId}`}>
                <Button variant="ghost" size="sm" className="w-9 h-8 p-0 rounded-[18px]">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-['Arial:Regular',_sans-serif] text-[32px] text-slate-900 leading-[48px]">
                    {event.name}
                  </h1>
                  <Badge className={`rounded-full px-3 py-1 text-[11px] font-['Arial:Bold',_sans-serif] uppercase tracking-[0.5px] ${getStatusColor(event.status)}`}>
                    {event.status}
                  </Badge>
                </div>
                <p className="font-['Arial:Regular',_sans-serif] text-[14px] text-slate-600">
                  {formatDateTime(event.starts_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="bg-[#f8f7f4] border-[rgba(0,0,0,0.08)] h-8 px-3 rounded-[12px] text-sm text-slate-900">
                Export
                <Download className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" size="sm" className="w-9 h-8 p-0 rounded-[18px]">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[16px] p-1 w-[615px]">
            <div className="grid grid-cols-5 gap-0">
              <Button variant="ghost" className="h-9 rounded-[10px] text-slate-900 opacity-70 hover:opacity-100">
                Event Control
              </Button>
              <Button variant="ghost" className="h-9 rounded-[10px] text-slate-900 opacity-70 hover:opacity-100">
                QR & Links
              </Button>
              <Button variant="ghost" className="h-9 rounded-[10px] text-slate-900 opacity-70 hover:opacity-100">
                Analytics
              </Button>
              <Button variant="ghost" className="h-9 rounded-[10px] text-slate-900 opacity-70 hover:opacity-100">
                Race Results
              </Button>
              <Button className="h-9 rounded-[10px] bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white hover:opacity-90">
                Event Settings
              </Button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex justify-center">
            <div className="w-[896px] space-y-6">
              {/* Accordion Container */}
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] overflow-hidden">

                {/* General Details Section */}
                <div>
                  <div className="border-b border-[rgba(0,0,0,0.08)]">
                    <button
                      onClick={() => toggleSection('general')}
                      className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-['Arial:Regular',_sans-serif] text-[18px] text-slate-900 mb-1">General Details</h3>
                          <p className="font-['Arial:Regular',_sans-serif] text-[14px] text-slate-600">Basic event information and descriptions</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${openSection === 'general' ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                  </div>
                  {openSection === 'general' && (
                    <div className="p-6 space-y-6">
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
                    </div>
                  )}
                </div>

                {/* Configuration Section */}
                <div>
                  <div className="border-b border-[rgba(0,0,0,0.08)]">
                    <button
                      onClick={() => toggleSection('configuration')}
                      className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-['Arial:Regular',_sans-serif] text-[18px] text-slate-900 mb-1">Configuration</h3>
                          <p className="font-['Arial:Regular',_sans-serif] text-[14px] text-slate-600">Participant limits and data collection settings</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${openSection === 'configuration' ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                  </div>
                  {openSection === 'configuration' && (
                    <div className="p-6 space-y-6">
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
                      <div className="mt-2 text-sm text-gray-500">
                        Current participants: <span className="font-medium">{stats?.participantCount || 0}</span>
                      </div>
                    </div>

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
                      </div>
                    )}

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
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </div>

                {/* Status & Sharing Section */}
                <div>
                  <div className="border-b border-[rgba(0,0,0,0.08)]">
                    <button
                      onClick={() => toggleSection('status')}
                      className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-['Arial:Regular',_sans-serif] text-[18px] text-slate-900 mb-1">Status & Sharing</h3>
                          <p className="font-['Arial:Regular',_sans-serif] text-[14px] text-slate-600">Event lifecycle and sharing options</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${openSection === 'status' ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                  </div>
                  {openSection === 'status' && (
                    <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Current Status</Label>
                        <p className="text-xs text-gray-500">Event is currently {event.status}</p>
                      </div>
                      <Badge className={getStatusColor(event.status)}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                    </div>

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
                      </div>
                    </div>

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
                    </div>
                  )}
                </div>

                {/* Danger Zone Section */}
                <div>
                  <button
                    onClick={() => toggleSection('danger')}
                    className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-['Arial:Regular',_sans-serif] text-[18px] text-red-600 mb-1">Danger Zone</h3>
                        <p className="font-['Arial:Regular',_sans-serif] text-[14px] text-slate-600">Irreversible actions that will permanently affect your event</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSection === 'danger' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openSection === 'danger' && (
                    <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">Delete Event</h4>
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
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      loadEventSettings() // Reset form
                    }
                  }}
                  disabled={saving || !hasUnsavedChanges}
                  className="bg-[#f8f7f4] border-[rgba(0,0,0,0.08)] h-11 px-4 rounded-[12px] text-slate-900"
                >
                  Discard Changes
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white h-11 px-4 rounded-[12px] hover:opacity-90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}