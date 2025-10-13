'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { StatusPill } from '@/components/ui/status-pill'
import { AddParticipantModal } from '@/components/shared/add-participant-modal'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
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
  ChevronLeft,
  ChevronRight,
  Users,
  Trophy,
  Calendar,
  UserPlus,
  Clock,
  Play,
  Shuffle,
  Zap,
  QrCode,
  BarChart3,
  Eye,
  Download,
  Settings,
  CheckCircle,
  Copy,
  Printer,
  Share2,
  TrendingUp,
  Target,
  DollarSign,
  Activity,
  Medal,
  CheckCircle2,
  Podium,
  LayoutDashboard,
  ChevronDown,
  LogOut,
  Search,
  Filter,
  MoreVertical,
  X,
  Save,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react'

type Event = {
  id: string
  name: string
  starts_at: string
  status: 'active' | 'drawing' | 'completed' | 'cancelled'
  capacity: number
  mode: 'sweep' | 'calcutta'
  entry_fee?: number
  first_place_percentage?: number
  second_place_percentage?: number
  third_place_percentage?: number
  created_at: string
}

type Participant = {
  id: string
  participant_name: string
  email: string
  phone?: string
  horse_number?: number
  horse_name?: string
  created_at: string
  payment_status?: 'paid' | 'pending' | 'expired'
}

type DrawStats = {
  assigned: number
  waiting: number
  availableHorses: number
  progressPercentage: number
}

const TABS = [
  { id: 0, label: 'Overview', icon: LayoutDashboard },
  { id: 1, label: 'Event Control', icon: Play },
  { id: 2, label: 'QR & Links', icon: QrCode },
  { id: 3, label: 'Analytics', icon: BarChart3 },
  { id: 4, label: 'Race Results', icon: Trophy },
  { id: 5, label: 'Event Settings', icon: Settings }
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active': return Play
    case 'drawing': return Clock
    case 'completed': return Trophy
    default: return Calendar
  }
}

function calculatePoolAmount(event: Event | null): number {
  if (!event || !event.entry_fee || event.entry_fee === 0) {
    return 0
  }
  return event.entry_fee * event.capacity
}

function formatCurrency(amount: number): string {
  if (amount === 0) {
    return 'Free Event'
  }
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

function GradientProgressBar({ percentage, className }: { percentage: number, className?: string }) {
  return (
    <div className={`bg-gray-100 border border-gray-200 rounded-full h-3 overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-b from-[#FF8A00] via-[#FF4D8D] to-[#8B5CF6] rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function ActionCard({
  title,
  description,
  bulletPoints,
  buttonText,
  buttonIcon: ButtonIcon,
  onButtonClick,
  disabled = false,
  buttonVariant = 'primary'
}: {
  title: string
  description: string
  bulletPoints: string[]
  buttonText: string
  buttonIcon: React.ComponentType<{ className?: string }>
  onButtonClick: () => void
  disabled?: boolean
  buttonVariant?: 'primary' | 'secondary'
}) {
  return (
    <div className="bg-white border border-gray-200/50 rounded-[20px] p-8 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-[20px] size-12 flex items-center justify-center ${
            buttonVariant === 'primary' ? 'bg-slate-100' : 'bg-violet-100'
          }`}>
            <ButtonIcon className={`h-6 w-6 ${
              buttonVariant === 'primary' ? 'text-slate-600' : 'text-violet-500'
            }`} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>

        <p className="text-slate-600">{description}</p>

        <ul className="space-y-1">
          {bulletPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="text-violet-500 mt-1">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onButtonClick}
        disabled={disabled}
        className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
          buttonVariant === 'primary'
            ? 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400'
            : 'bg-[#f8f7f4] border-2 border-violet-200/60 text-violet-500 hover:bg-violet-50 disabled:opacity-50'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <ButtonIcon className="h-4 w-4" />
        {buttonText}
      </button>
    </div>
  )
}

function ViewAllParticipantsModal({
  isOpen,
  onClose,
  participants,
  onToggleClick,
  onAddParticipant
}: {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  onToggleClick?: (participant: Participant, newStatus: 'paid' | 'pending') => void
  onAddParticipant?: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  if (!isOpen) return null

  // Filter participants based on search and filter
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.email.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    switch (filterType) {
      case 'paid':
        return participant.payment_status === 'paid'
      case 'unpaid':
        return participant.payment_status === 'pending' || participant.payment_status === 'expired'
      case 'assigned':
        return participant.horse_number != null
      case 'unassigned':
        return participant.horse_number == null
      default:
        return true
    }
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-[20px] w-[900px] h-[700px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">All Participants</h2>
            <p className="text-sm text-slate-600">{participants.length} total participants</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>

            {/* Add Participant Button */}
            <button
              onClick={() => {
                onAddParticipant?.()
                onClose()
              }}
              className="bg-[#f8f7f4] border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-gray-50 flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Participant
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Participants List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((participant) => (
                <ParticipantRowModal
                  key={participant.id}
                  participant={participant}
                  onToggleClick={onToggleClick}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No participants found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  participantName
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  participantName: string
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-[400px] h-[250px] shadow-2xl p-6 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Confirm Payment Status Change</h3>
          <p className="text-sm text-gray-600">
            Are you sure you want to mark <strong>{participantName}</strong> as unpaid? This participant was previously marked as paid.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-slate-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm"
          >
            Confirm Change
          </button>
        </div>
      </div>
    </div>
  )
}

function ParticipantRowModal({ participant, onToggleClick }: {
  participant: Participant
  onToggleClick?: (participant: Participant, newStatus: 'paid' | 'pending') => void
}) {

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
          <span className="text-white font-medium text-sm">
            {getInitials(participant.participant_name)}
          </span>
        </div>

        {/* Details */}
        <div>
          <h4 className="font-medium text-slate-900">{participant.participant_name}</h4>
          <p className="text-sm text-slate-600">{participant.email}</p>
          <p className="text-xs text-slate-500">
            {new Date(participant.created_at).toLocaleDateString()} at {new Date(participant.created_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Horse Badge */}
        {participant.horse_number ? (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            Horse #{participant.horse_number}
          </div>
        ) : (
          <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
            No horse assigned
          </div>
        )}

        {/* Payment Toggle */}
        <div className="flex flex-col items-center gap-1">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={participant.payment_status === 'paid'}
              onChange={(e) => onToggleClick?.(participant, e.target.checked ? 'paid' : 'pending')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
          <span className="text-xs text-gray-600">
            {participant.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
          </span>
        </div>

        {/* More Menu */}
        <button className="p-2 hover:bg-gray-200 rounded-lg">
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
  )
}

function ParticipantRow({ participant, onToggleClick }: {
  participant: Participant
  onToggleClick?: (participant: Participant, newStatus: 'paid' | 'pending') => void
}) {
  const initials = getInitials(participant.participant_name)
  const isPaid = participant.payment_status === 'paid'

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[20px] p-5 flex items-center gap-4 hover:shadow-sm transition-all duration-200">
      {/* Left side - Avatar and Info */}
      <div className="flex items-center gap-4 flex-1">
        <div className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full w-12 h-12 flex items-center justify-center shadow-sm">
          <span className="text-white text-sm font-semibold">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-slate-900 truncate leading-tight">
            {participant.participant_name}
          </p>
          <p className="text-sm text-slate-500 truncate mt-0.5">
            {participant.email}
          </p>
        </div>
      </div>

      {/* Right side - Horse Badge and Payment Toggle */}
      <div className="flex items-center gap-4">
        {/* Horse Badge */}
        {participant.horse_number ? (
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-full px-4 py-2 shadow-sm">
            <span className="text-sm font-bold text-violet-700 uppercase tracking-wide">
              Horse #{participant.horse_number}
            </span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-full px-4 py-2 shadow-sm">
            <span className="text-sm font-bold text-orange-600 uppercase tracking-wide">
              Waiting
            </span>
          </div>
        )}

        {/* Payment Toggle */}
        <button
          onClick={() => onToggleClick?.(participant, isPaid ? 'unpaid' : 'paid')}
          className={`w-12 h-6 rounded-full border-2 transition-all relative shadow-sm ${
            isPaid
              ? 'bg-emerald-500 border-emerald-500'
              : 'bg-slate-200 border-slate-300 hover:border-slate-400'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform absolute top-0.5 ${
              isPaid ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

function HorseButton({ number, isAssigned, onClick }: {
  number: number
  isAssigned: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full aspect-square rounded-[16px] border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 ${
        isAssigned
          ? 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300 text-violet-700 shadow-sm hover:shadow-md'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      #{number}
    </button>
  )
}

function TabMenu({ activeTab, setActiveTab }: { activeTab: number, setActiveTab: (tab: number) => void }) {
  return (
    <div className="bg-[#F8F7F4] border border-black/8 rounded-[16px] p-1.5 inline-flex w-[900px] h-[46px]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded-[12px] text-sm font-medium transition-all flex-1 ${
            activeTab === tab.id
              ? 'bg-gradient-to-b from-[#FF8A00] via-[#FF4D8D] to-[#8B5CF6] text-white shadow-lg'
              : 'text-slate-600 hover:bg-black/5'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function EventOverviewContent() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [showViewAllParticipantsModal, setShowViewAllParticipantsModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all', 'paid', 'unpaid', 'assigned', 'unassigned'
  const [activeTab, setActiveTab] = useState(0)
  const [showVenueDropdown, setShowVenueDropdown] = useState(false)
  const venueDropdownRef = useRef<HTMLDivElement>(null)

  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false)
  const [pendingPaymentChange, setPendingPaymentChange] = useState<{
    participantId: string
    participantName: string
    newStatus: 'paid' | 'unpaid'
  } | null>(null)
  const [drawStats, setDrawStats] = useState<DrawStats>({
    assigned: 0,
    waiting: 0,
    availableHorses: 24,
    progressPercentage: 0
  })
  const [isDrawing, setIsDrawing] = useState(false)

  // QR Code ref for copy/download/print functionality
  const qrCodeRef = useRef<HTMLDivElement>(null)

  // Settings state
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsStatusChanging, setSettingsStatusChanging] = useState(false)
  const [settingsDeleting, setSettingsDeleting] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>('general')
  const [settingsFormData, setSettingsFormData] = useState({
    name: '',
    description: '',
    starts_at: '',
    timezone: 'Australia/Melbourne',
    capacity: 100,
    mode: 'sweep' as 'sweep' | 'calcutta',
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

  // Join URL for QR code and sharing
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${eventId}/enter`
    : `https://app.melbournecupsweep.com.au/events/${eventId}/enter`

  useEffect(() => {
    fetchEventData()
  }, [eventId])

  // Handle click outside venue dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(event.target as Node)) {
        setShowVenueDropdown(false)
      }
    }

    if (showVenueDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showVenueDropdown])

  // Load settings when Settings tab is clicked
  useEffect(() => {
    if (activeTab === 5) {
      loadEventSettings()
    }
  }, [activeTab])

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  async function fetchEventData() {
    try {
      setLoading(true)

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

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('tenant_id', tenantUser.tenant_id)
        .single()

      if (eventError) throw eventError
      if (!eventData) throw new Error('Event not found')

      setEvent(eventData)

      // Fetch participants and their assignments separately
      const { data: participantsData, error: participantsError } = await supabase
        .from('patron_entries')
        .select(`
          id,
          participant_name,
          email,
          phone,
          created_at,
          payment_status
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (participantsError) throw participantsError

      // Fetch assignments to get horse numbers
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          patron_entry_id,
          event_horses!inner(
            number,
            name
          )
        `)
        .in('patron_entry_id', (participantsData || []).map(p => p.id))

      if (assignmentsError) {
        console.warn('Could not fetch assignments:', assignmentsError)
      }

      // Create a map of participant ID to horse assignment
      const assignmentMap = new Map()
      if (assignmentsData) {
        assignmentsData.forEach(assignment => {
          assignmentMap.set(assignment.patron_entry_id, {
            horse_number: assignment.event_horses.number,
            horse_name: assignment.event_horses.name
          })
        })
      }

      // Transform the data to match our Participant type
      const transformedParticipants = (participantsData || []).map((p: any) => {
        const assignment = assignmentMap.get(p.id)
        return {
          id: p.id,
          participant_name: p.participant_name,
          email: p.email,
          phone: p.phone,
          created_at: p.created_at,
          horse_number: assignment?.horse_number,
          horse_name: assignment?.horse_name,
          payment_status: p.payment_status as 'paid' | 'pending' | 'expired'
        }
      })

      setParticipants(transformedParticipants)

      // Debug payment status calculation
      console.log('DEBUG: Payment status breakdown:')
      console.log('Total participants:', transformedParticipants.length)
      console.log('Payment statuses:', transformedParticipants.map(p => ({ name: p.participant_name, status: p.payment_status })))
      console.log('Paid count:', transformedParticipants.filter(p => p.payment_status === 'paid').length)
      console.log('Pending count:', transformedParticipants.filter(p => p.payment_status === 'pending').length)
      console.log('Expired count:', transformedParticipants.filter(p => p.payment_status === 'expired').length)

      // Calculate stats
      const assigned = transformedParticipants.filter(p => p.horse_number).length
      const waiting = transformedParticipants.filter(p => !p.horse_number).length
      const availableHorses = 24 - assigned
      const progressPercentage = Math.round((assigned / 24) * 100)

      setDrawStats({
        assigned,
        waiting,
        availableHorses,
        progressPercentage
      })

    } catch (err) {
      console.error('Error fetching event data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch event data')
    } finally {
      setLoading(false)
    }
  }

  async function handleParticipantAdded() {
    await fetchEventData()
    setShowAddParticipantModal(false)
  }

  function handleToggleClick(participant: Participant, newStatus: 'paid' | 'pending') {
    // If changing FROM paid TO unpaid, show confirmation modal
    if (participant.payment_status === 'paid' && newStatus === 'pending') {
      setPendingPaymentChange({
        participantId: participant.id,
        participantName: participant.participant_name,
        newStatus: newStatus
      })
      setShowPaymentConfirmModal(true)
      // DO NOT call handlePaymentToggle - wait for confirmation
      return
    }

    // All other changes (unpaid→paid) proceed immediately
    handlePaymentToggle(participant.id, newStatus)
  }

  async function handlePaymentToggle(participantId: string, newStatus: 'paid' | 'unpaid') {
    try {
      // Update local state immediately for responsive UI
      setParticipants(prevParticipants =>
        prevParticipants.map(p =>
          p.id === participantId ? { ...p, payment_status: newStatus } : p
        )
      )

      // TODO: Update payment status in database
      console.log(`Payment status for ${participantId} changed to ${newStatus}`)
    } catch (err) {
      console.error('Error updating payment status:', err)
      // Revert local state on error
      await fetchEventData()
    }
  }

  const confirmPaymentChange = async () => {
    if (pendingPaymentChange) {
      await handlePaymentToggle(
        pendingPaymentChange.participantId,
        pendingPaymentChange.newStatus
      )
      setShowPaymentConfirmModal(false)
      setPendingPaymentChange(null)
    }
  }

  const cancelPaymentChange = () => {
    // Just close modal, toggle stays in original position
    setShowPaymentConfirmModal(false)
    setPendingPaymentChange(null)
  }

  function handleHorseClick(horseNumber: number) {
    // TODO: Implement horse assignment logic
    console.log(`Horse ${horseNumber} clicked`)
  }

  async function handleDrawNext() {
    if (isDrawing || drawStats.waiting === 0 || drawStats.availableHorses === 0) return

    try {
      setIsDrawing(true)

      // Call the API route to handle the draw
      const response = await fetch(`/api/events/${eventId}/draw-next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to draw next participant')
      }

      // Show success notification
      const { assignment } = data
      console.log(`🎉 ${assignment.participant.name} assigned to Horse #${assignment.horse.number} - ${assignment.horse.name}`)

      // Refresh data to show the new assignment
      await fetchEventData()

    } catch (err) {
      console.error('Error drawing next participant:', err)
      alert(err instanceof Error ? err.message : 'Failed to draw next participant')
    } finally {
      setIsDrawing(false)
    }
  }

  async function handleDrawAll() {
    if (isDrawing || drawStats.waiting === 0 || drawStats.availableHorses === 0) return

    const confirmMessage = `This will assign horses to all ${drawStats.waiting} waiting participants. Continue?`
    if (!confirm(confirmMessage)) return

    try {
      setIsDrawing(true)

      // Get waiting participants (oldest first)
      const waitingParticipants = participants
        .filter(p => !p.horse_number)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      // Get all assigned horse numbers
      const assignedNumbers = new Set(
        participants
          .filter(p => p.horse_number)
          .map(p => p.horse_number!)
      )

      // Get available horse numbers (1-24)
      const availableNumbers = Array.from({ length: 24 }, (_, i) => i + 1)
        .filter(num => !assignedNumbers.has(num))

      if (availableNumbers.length < waitingParticipants.length) {
        throw new Error('Not enough horses available for all participants')
      }

      // Shuffle available horses
      const shuffledHorses = [...availableNumbers].sort(() => Math.random() - 0.5)

      // Get horse details for all horses we'll assign
      const { data: horsesData, error: horsesError } = await supabase
        .from('event_horses')
        .select('id, number, name')
        .eq('event_id', eventId)
        .in('number', shuffledHorses.slice(0, waitingParticipants.length))

      if (horsesError) throw horsesError

      // Create horse number to ID mapping
      const horseMap = new Map()
      horsesData.forEach(horse => {
        horseMap.set(horse.number, horse.id)
      })

      // Create assignments
      const assignments = waitingParticipants.map((participant, index) => ({
        patron_entry_id: participant.id,
        event_horse_id: horseMap.get(shuffledHorses[index])
      }))

      // Insert all assignments
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert(assignments)

      if (assignmentError) throw assignmentError

      // Show success notification
      console.log(`🎉 Successfully assigned ${assignments.length} horses!`)

      // Refresh data
      await fetchEventData()

    } catch (err) {
      console.error('Error drawing all participants:', err)
      alert(err instanceof Error ? err.message : 'Failed to draw all participants')
    } finally {
      setIsDrawing(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading event...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !event) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600">Error: {error || 'Event not found'}</p>
            <button
              onClick={fetchEventData}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const assignedHorses = new Set(
    participants
      .filter(p => p.horse_number)
      .map(p => p.horse_number!)
  )

  const allAssigned = drawStats.waiting === 0

  // QR Code functionality
  const handleCopyQR = async () => {
    try {
      const qrSvg = document.getElementById('qr-code-canvas')
      if (!qrSvg) return

      // Convert SVG to canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size with padding
      canvas.width = 350
      canvas.height = 350

      // Create white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 350, 350)

      // Create an image from the SVG
      const svgData = new XMLSerializer().serializeToString(qrSvg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        // Draw the SVG image centered on canvas
        ctx.drawImage(img, 50, 50, 250, 250)

        // Convert canvas to blob and copy
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ])
              toast.success('QR code copied to clipboard', { duration: 2000 })
            } catch (clipboardError) {
              console.error('Failed to copy to clipboard:', clipboardError)
              toast.error('Failed to copy QR code')
            }
          }
          URL.revokeObjectURL(url)
        }, 'image/png')
      }
      img.src = url
    } catch (error) {
      console.error('Error copying QR code:', error)
      toast.error('Failed to copy QR code')
    }
  }

  const handleDownloadQR = () => {
    try {
      const qrSvg = document.getElementById('qr-code-canvas')
      if (!qrSvg) return

      // Convert SVG to canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size with padding
      canvas.width = 350
      canvas.height = 350

      // Create white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 350, 350)

      // Create an image from the SVG
      const svgData = new XMLSerializer().serializeToString(qrSvg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        // Draw the SVG image centered on canvas
        ctx.drawImage(img, 50, 50, 250, 250)

        // Create download link
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = `QR Code ${event?.name || 'Event'}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(downloadUrl)
            toast.success('QR code downloaded', { duration: 2000 })
          }
          URL.revokeObjectURL(url)
        }, 'image/png')
      }
      img.src = url
    } catch (error) {
      console.error('Error downloading QR code:', error)
      toast.error('Failed to download QR code')
    }
  }

  const handlePrintQR = () => {
    try {
      const qrSvg = document.getElementById('qr-code-canvas')
      if (!qrSvg) {
        toast.error('QR code not found')
        return
      }

      // Convert SVG to canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        toast.error('Failed to create canvas')
        return
      }

      // Set canvas size with padding
      canvas.width = 350
      canvas.height = 350

      // Create white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 350, 350)

      // Create an image from the SVG
      const svgData = new XMLSerializer().serializeToString(qrSvg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        // Draw the SVG image centered on canvas
        ctx.drawImage(img, 50, 50, 250, 250)

        // Get the data URL for the QR image
        const dataUrl = canvas.toDataURL('image/png')

        // Create a new window for printing
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
          toast.error('Failed to open print window')
          URL.revokeObjectURL(url)
          return
        }

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>QR Code - ${event?.name || 'Event'}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 40px;
                margin: 0;
              }
              .qr-container {
                display: inline-block;
                padding: 20px;
                border: 2px solid #000;
                margin: 20px 0;
              }
              .qr-image {
                width: 300px;
                height: 300px;
                margin: 0 auto 20px;
              }
              .url {
                font-family: monospace;
                font-size: 14px;
                word-break: break-all;
                margin: 10px 0;
              }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <h1>${event?.name || 'Event'} - QR Code</h1>
            <div class="qr-container">
              <img src="${dataUrl}" class="qr-image" alt="QR Code" />
              <div class="url">${joinUrl}</div>
            </div>
            <p>Scan to join the event</p>
          </body>
          </html>
        `)

        printWindow.document.close()
        printWindow.focus()

        // Wait for content to load then print
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)

        URL.revokeObjectURL(url)
        toast.success('Print dialog opened', { duration: 2000 })
      }

      img.onerror = () => {
        console.error('Failed to load SVG image')
        toast.error('Failed to load QR code image')
        URL.revokeObjectURL(url)
      }

      img.src = url
    } catch (error) {
      console.error('Error printing QR code:', error)
      toast.error('Failed to print QR code')
    }
  }

  const handleCopyLiveViewUrl = async () => {
    try {
      const liveViewUrl = `https://sweep.app/live/${eventId}`
      await navigator.clipboard.writeText(liveViewUrl)
      toast.success('Live view URL copied to clipboard', { duration: 2000 })
    } catch (err) {
      console.error('Error copying live view URL:', err)
      toast.error('Failed to copy URL')
    }
  }

  const handleShareJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      toast.success('Join link copied to clipboard', { duration: 2000 })
    } catch (err) {
      console.error('Error copying join link:', err)
      toast.error('Failed to copy link')
    }
  }

  // Settings functions
  async function loadEventSettings() {
    try {
      setSettingsSaving(true)
      setError(null)

      const response = await fetch(`/api/events/${eventId}/settings`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load event settings')
      }

      const settings = data.data

      // Populate form with current values
      setSettingsFormData({
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

    } catch (err) {
      console.error('Error loading event settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  async function handleSettingsSave() {
    if (!settingsFormData.name.trim()) {
      toast.error('Event name is required')
      return
    }

    setSettingsSaving(true)
    try {
      const updateData = {
        name: settingsFormData.name.trim(),
        description: settingsFormData.description.trim() || undefined,
        starts_at: settingsFormData.starts_at ? new Date(settingsFormData.starts_at).toISOString() : undefined,
        timezone: settingsFormData.timezone,
        capacity: settingsFormData.capacity,
        mode: settingsFormData.mode,
        lead_capture: settingsFormData.lead_capture,
        requires_payment: settingsFormData.requires_payment,
        entry_fee: settingsFormData.requires_payment ? settingsFormData.entry_fee : undefined,
        payment_timeout_minutes: settingsFormData.requires_payment ? settingsFormData.payment_timeout_minutes : undefined,
        promo_enabled: settingsFormData.promo_enabled,
        promo_message: settingsFormData.promo_enabled ? settingsFormData.promo_message : undefined,
        promo_duration: settingsFormData.promo_enabled ? settingsFormData.promo_duration : undefined,
        custom_terms: settingsFormData.custom_terms.trim() || undefined,
        custom_rules: settingsFormData.custom_rules.trim() || undefined
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
      await loadEventSettings() // Refresh data
      await fetchEventData() // Refresh main event data

    } catch (err) {
      console.error('Error saving event settings:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save event settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  async function handleStatusChange(newStatus: string, reason?: string) {
    setSettingsStatusChanging(true)
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
      await fetchEventData() // Refresh main event data

    } catch (err) {
      console.error('Error changing status:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setSettingsStatusChanging(false)
    }
  }

  async function handleSettingsDelete() {
    if (settingsDeleteConfirmName !== event?.name) {
      toast.error('Please type the exact event name to confirm deletion')
      return
    }

    setSettingsDeleting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/settings?confirm=${encodeURIComponent(settingsDeleteConfirmName)}`, {
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
      setSettingsDeleting(false)
    }
  }

  function updateSettingsFormData(field: keyof typeof settingsFormData, value: any) {
    setSettingsFormData(prev => ({ ...prev, [field]: value }))
  }

  function toggleSection(section: string) {
    setOpenSection(openSection === section ? null : section)
  }

  function getSettingsJoinUrl() {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin
      return `${baseUrl}/events/${eventId}/enter`
    }
    return ''
  }

  function getSettingsResultsUrl() {
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
      case 'active': return 'bg-green-100 text-green-800'
      case 'drawing': return 'bg-violet-100 text-violet-700 border-violet-500'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function getAvailableStatusTransitions() {
    if (!event) return []

    const currentStatus = event.status
    const transitions: any[] = []

    switch (currentStatus) {
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
          { from: 'cancelled', to: 'active', label: 'Reactivate', description: 'Restore to active status', variant: 'default' }
        )
        break
    }

    return transitions
  }

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Overview
        return (
          <div className="space-y-8">
            {/* Stats Cards - Figma Design */}
            <div className="grid grid-cols-3 gap-6">
              <StatCard
                title="Participants"
                value={`${participants.length} / ${event.capacity}`}
                subtitle="Current registrations"
                icon={Users}
                className="h-[134px]"
              />
              <StatCard
                title="Horses Assigned"
                value={`${drawStats.assigned} / 24`}
                subtitle="Total assignments"
                icon={Trophy}
                className="h-[134px]"
              />
              <StatCard
                title="Payment Status"
                value={`${Math.round((participants.length / event.capacity) * 100)}%`}
                subtitle="Payments received"
                icon={CheckCircle}
                className="h-[134px]"
              />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Participants Column */}
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Participants</h3>
                  <button
                    onClick={() => setShowAddParticipantModal(true)}
                    className="bg-[#f8f7f4] border border-gray-200/50 h-8 px-3 rounded-xl flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Participant
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {participants.length > 0 ? (
                    participants.slice(0, 6).map((participant) => (
                      <ParticipantRow
                        key={participant.id}
                        participant={participant}
                        onToggleClick={handleToggleClick}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">No Participants Yet</h4>
                      <p className="text-sm text-slate-600 text-center mb-6 max-w-xs">
                        Get started by sharing your event QR code or join link with participants
                      </p>
                      <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button
                          onClick={handlePrintQR}
                          className="bg-gradient-to-r from-[#ff6b35] to-[#a855f7] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          <QrCode className="h-4 w-4" />
                          Print QR Code
                        </button>
                        <button
                          onClick={handleShareJoinLink}
                          className="bg-[#f8f7f4] border border-gray-200 text-slate-900 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Share2 className="h-4 w-4" />
                          Share Join Link
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 text-center mt-4">
                        Participants can also join by scanning the QR code
                      </p>
                    </div>
                  )}
                </div>

                {/* View All Button - Only show when there are participants */}
                {participants.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setShowViewAllParticipantsModal(true)}
                      className="w-full bg-[#f8f7f4] border border-gray-200/50 rounded-xl py-2.5 px-4 text-sm font-medium text-slate-900 hover:bg-gray-50 transition-colors"
                    >
                      View All ({participants.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Horse Field Column */}
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Horse Field</h3>
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">24 runners</span>
                </div>

                <div className="grid grid-cols-6 gap-3">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((number) => (
                    <HorseButton
                      key={number}
                      number={number}
                      isAssigned={assignedHorses.has(number)}
                      onClick={() => handleHorseClick(number)}
                    />
                  ))}
                </div>

                {/* Legend */}
                <div className="border-t border-gray-200/50 pt-4 flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-violet-100 border border-violet-200/60 rounded"></div>
                    <span className="text-xs text-slate-600">Taken</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#f8f7f4] border border-gray-200/60 rounded"></div>
                    <span className="text-xs text-slate-600">Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 1: // Event Control
        return (
          <div className="space-y-8">
            {/* Draw Controls - Only show when participants exist */}
            {participants.length > 0 ? (
              <div className="bg-[#f8f7f4] rounded-[20px] p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Draw Progress</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Progress</span>
                    <span className="text-slate-900 font-medium">{drawStats.progressPercentage}%</span>
                  </div>
                  <GradientProgressBar percentage={drawStats.progressPercentage} />
                </div>

                <div className="flex items-center justify-between text-sm mb-6">
                  <span className="text-slate-600">
                    {drawStats.assigned} of 24 horses assigned
                  </span>
                  <span className="text-slate-900 font-medium">
                    {drawStats.waiting} participants waiting
                  </span>
                </div>

                {/* All Assigned Message */}
                {allAssigned && (
                  <div className="bg-green-50 border border-green-200 rounded-[20px] p-6 text-center mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-green-900 mb-1">All participants assigned!</h3>
                    <p className="text-green-700">Every participant has been assigned a horse. The draw is complete.</p>
                  </div>
                )}

                {/* Action Cards */}
                {!allAssigned && (
                  <div className="grid grid-cols-2 gap-6">
                    <ActionCard
                      title="Draw Next"
                      description="Draw a random horse for the next waiting participant"
                      bulletPoints={[
                        "Perfect for building suspense during your event",
                        "Results appear live on the QR code display",
                        "Creates an exciting reveal moment"
                      ]}
                      buttonText={isDrawing ? "Drawing..." : "Draw Next Participant"}
                      buttonIcon={Shuffle}
                      onButtonClick={handleDrawNext}
                      disabled={isDrawing || drawStats.waiting === 0}
                      buttonVariant="primary"
                    />

                    <ActionCard
                      title="Draw All"
                      description="Instantly assign all remaining participants to horses"
                      bulletPoints={[
                        "Fast and convenient for quick setup",
                        "Participants can check results via QR code",
                        "Great for online or async sweeps"
                      ]}
                      buttonText={isDrawing ? "Drawing..." : "Draw All Remaining"}
                      buttonIcon={Zap}
                      onButtonClick={handleDrawAll}
                      disabled={isDrawing || drawStats.waiting === 0}
                      buttonVariant="secondary"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No participants to draw</h3>
                <p className="text-slate-600 mb-4">Add participants first to start drawing horses</p>
                <button
                  onClick={() => setShowAddParticipantModal(true)}
                  className="bg-gradient-to-r from-[#ff6b35] to-[#a855f7] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Add Participant
                </button>
              </div>
            )}
          </div>
        )

      case 2: // QR & Links
        return (
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Participant Signup QR Code */}
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-8">
              <h3 className="text-base text-slate-900 mb-6">
                Participant Signup QR Code
              </h3>

              <div className="flex flex-col items-center gap-4 mb-6">
                {/* QR Code */}
                <div
                  ref={qrCodeRef}
                  className="bg-white p-8 rounded-[16px] border-4 border-gray-200"
                >
                  <QRCodeSVG
                    id="qr-code-canvas"
                    value={joinUrl}
                    size={250}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {/* URL Display */}
                <div className="bg-[rgba(248,247,244,0.3)] rounded-[12px] p-4 w-full">
                  <p className="font-mono text-sm text-slate-900">
                    {joinUrl}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  <button
                    onClick={handleCopyQR}
                    className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-100 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={handleDownloadQR}
                    className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={handlePrintQR}
                    className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] px-4 py-3 flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-100 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-600 text-center">
                Display this QR code at your venue for easy participant signup
              </p>
            </div>

            {/* Right Column - Live View TV Display */}
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-8">
              <h3 className="text-base text-slate-900 mb-4">
                Display Live View on Your TV
              </h3>

              <div className="space-y-4 mb-6">
                <p className="text-sm text-slate-600">
                  Enter this URL on your TV:
                </p>

                {/* TV URL Display */}
                <div className="bg-[#ffebe6] border border-[rgba(0,0,0,0.08)] rounded-[12px] p-4 flex items-center justify-between">
                  <p className="font-mono font-bold text-base text-slate-900">
                    sweep.app/live/{eventId}
                  </p>
                  <button
                    onClick={handleCopyLiveViewUrl}
                    className="w-5 h-5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Copy className="w-full h-full" />
                  </button>
                </div>

                <div className="text-center py-4">
                  <p className="text-sm text-slate-600 mb-4">
                    Or scan with your TV remote:
                  </p>

                  {/* TV QR Code */}
                  <div className="bg-[rgba(248,247,244,0.3)] rounded-[12px] w-[150px] h-[150px] mx-auto flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  How to use:
                </h4>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  <li>• Type the URL into your TV browser or smart device</li>
                  <li>• Display will update automatically during the race</li>
                  <li>• Perfect for projection at your venue</li>
                </ul>
              </div>
            </div>
          </div>
        )

      case 3: // Analytics
        return (
          <div className="space-y-6">
            {/* Analytics Header */}
            <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Event Analytics</h2>
              <p className="text-slate-600">Track your event performance and participant engagement</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Registration Rate"
                value={`${Math.round((participants.length / event.capacity) * 100)}%`}
                subtitle={`${participants.length} of ${event.capacity} spots`}
                icon={Target}
                className="h-[120px]"
              />
              <StatCard
                title="Payment Rate"
                value={`${Math.round((participants.filter(p => p.payment_status === 'paid').length / Math.max(participants.length, 1)) * 100)}%`}
                subtitle={`${participants.filter(p => p.payment_status === 'paid').length} paid participants`}
                icon={DollarSign}
                className="h-[120px]"
              />
              <StatCard
                title="Draw Progress"
                value={`${Math.round(drawStats.progressPercentage)}%`}
                subtitle={`${drawStats.assigned} horses assigned`}
                icon={Activity}
                className="h-[120px]"
              />
              <StatCard
                title="Engagement"
                value="High"
                subtitle="Active participation"
                icon={TrendingUp}
                className="h-[120px]"
              />
            </div>

            {/* Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registration Timeline */}
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Registration Timeline</h3>
                <div className="h-48 bg-[rgba(248,247,244,0.3)] rounded-[12px] flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Registration timeline chart</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>Peak time: 2:00 PM - 4:00 PM</span>
                  <span>{participants.length} total registrations</span>
                </div>
              </div>

              {/* Payment Status Breakdown */}
              <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Payment Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm text-slate-900">Paid</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {participants.filter(p => p.payment_status === 'paid').length}
                      </span>
                      <span className="text-xs text-slate-600 ml-1">participants</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-slate-900">Pending</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {participants.filter(p => p.payment_status === 'pending' || p.payment_status === 'expired').length}
                      </span>
                      <span className="text-xs text-slate-600 ml-1">participants</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                      <span className="text-sm text-slate-900">Available Spots</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {event.capacity - participants.length}
                      </span>
                      <span className="text-xs text-slate-600 ml-1">remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Performance Summary */}
            <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Registration Success</h4>
                  <p className="text-sm text-slate-600">
                    {Math.round((participants.length / event.capacity) * 100)}% capacity filled
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Revenue Generated</h4>
                  <p className="text-sm text-slate-600">
                    {event?.entry_fee && event.entry_fee > 0
                      ? `${formatCurrency(participants.filter(p => p.payment_status === 'paid').length * event.entry_fee)} collected`
                      : 'Free Event'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Event Status</h4>
                  <p className="text-sm text-slate-600">
                    {event.status === 'active' ? 'Running smoothly' : `Status: ${event.status}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 4: // Race Results
        return (
          <div className="space-y-6">
            {/* Race Results Header */}
            <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Race Results</h2>
                  <p className="text-slate-600">Manage race outcomes and winner payouts</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill
                    label={event.status === 'completed' ? 'Results Final' : 'Pending Results'}
                    variant={event.status === 'completed' ? 'completed' : 'active'}
                    icon={event.status === 'completed' ? CheckCircle2 : Clock}
                  />
                </div>
              </div>
            </div>

            {event.status !== 'completed' ? (
              /* Pre-Race State */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Race Status */}
                <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Race Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Race Date</span>
                      <span className="text-sm font-medium text-slate-900">
                        {new Date(event.starts_at).toLocaleDateString('en-AU', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Race Time</span>
                      <span className="text-sm font-medium text-slate-900">
                        {new Date(event.starts_at).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total Prize Pool</span>
                      <span className="text-sm font-medium text-slate-900">
                        {formatCurrency(calculatePoolAmount(event))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Participants</span>
                      <span className="text-sm font-medium text-slate-900">
                        {participants.length} registered
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prize Breakdown */}
                <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Prize Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium text-slate-900">1st Place</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-700">
                        {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.first_place_percentage || 60) / 100)))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-slate-900">2nd Place</span>
                      </div>
                      <span className="text-sm font-bold text-gray-600">
                        {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.second_place_percentage || 30) / 100)))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-orange-500" />
                        <span className="text-sm font-medium text-slate-900">3rd Place</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600">
                        {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.third_place_percentage || 10) / 100)))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Post-Race Results State */
              <div className="space-y-6">
                {/* Winners Podium */}
                <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 text-center">🏆 Race Winners</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1st Place */}
                    <div className="text-center p-6 bg-gradient-to-b from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-[16px]">
                      <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">1st Place</h4>
                      <p className="text-sm text-slate-600 mb-2">Horse #3 - Exemplar</p>
                      <p className="text-sm font-medium text-slate-900">Sarah Johnson</p>
                      <p className="text-lg font-bold text-yellow-700 mt-2">
                        {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.first_place_percentage || 60) / 100)))}
                      </p>
                    </div>

                    {/* 2nd Place */}
                    <div className="text-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-gray-300 rounded-[16px]">
                      <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Medal className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">2nd Place</h4>
                      <p className="text-sm text-slate-600 mb-2">Horse #12 - Knight's Choice</p>
                      <p className="text-sm font-medium text-slate-900">Michael Chen</p>
                      <p className="text-lg font-bold text-gray-700 mt-2">
                        {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.second_place_percentage || 30) / 100)))}
                      </p>
                    </div>

                    {/* 3rd Place */}
                    <div className="text-center p-6 bg-gradient-to-b from-orange-50 to-orange-100 border-2 border-orange-300 rounded-[16px]">
                      <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Medal className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">3rd Place</h4>
                      <p className="text-sm text-slate-600 mb-2">Horse #7 - Onesmoothoperator</p>
                      <p className="text-sm font-medium text-slate-900">David Wilson</p>
                      <p className="text-lg font-bold text-orange-700 mt-2">
                        {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.third_place_percentage || 10) / 100)))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Results Table */}
                <div className="bg-white border border-gray-200/50 rounded-[20px] p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Complete Race Results</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Position</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Horse</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Participant</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Prize</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-2 text-sm font-bold text-yellow-600">1st</td>
                          <td className="py-3 px-2 text-sm text-slate-900">#3 Exemplar</td>
                          <td className="py-3 px-2 text-sm text-slate-900">Sarah Johnson</td>
                          <td className="py-3 px-2 text-sm font-bold text-right text-yellow-600">
                            {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.first_place_percentage || 60) / 100)))}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-2 text-sm font-bold text-gray-600">2nd</td>
                          <td className="py-3 px-2 text-sm text-slate-900">#12 Knight's Choice</td>
                          <td className="py-3 px-2 text-sm text-slate-900">Michael Chen</td>
                          <td className="py-3 px-2 text-sm font-bold text-right text-gray-600">
                            {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.second_place_percentage || 30) / 100)))}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-2 text-sm font-bold text-orange-600">3rd</td>
                          <td className="py-3 px-2 text-sm text-slate-900">#7 Onesmoothoperator</td>
                          <td className="py-3 px-2 text-sm text-slate-900">David Wilson</td>
                          <td className="py-3 px-2 text-sm font-bold text-right text-orange-600">
                            {formatCurrency(Math.round(calculatePoolAmount(event) * ((event?.third_place_percentage || 10) / 100)))}
                          </td>
                        </tr>
                        {participants.slice(3).map((participant, index) => (
                          <tr key={participant.id} className="border-b border-gray-50">
                            <td className="py-3 px-2 text-sm text-slate-500">{index + 4}th</td>
                            <td className="py-3 px-2 text-sm text-slate-700">
                              {participant.horse_number ? `#${participant.horse_number}` : 'No horse'}
                            </td>
                            <td className="py-3 px-2 text-sm text-slate-700">{participant.participant_name}</td>
                            <td className="py-3 px-2 text-sm text-right text-slate-500">$0</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Race Results Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Automatic Results Integration</h4>
                  <p className="text-sm text-blue-800">
                    Race results are automatically updated from official Melbourne Cup sources.
                    Winners are notified immediately via email and SMS when results are confirmed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 5: // Event Settings
        return (
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
                          value={settingsFormData.name}
                          onChange={(e) => updateSettingsFormData('name', e.target.value)}
                          placeholder="Melbourne Cup 2025"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mode">Event Mode</Label>
                        <Select value={settingsFormData.mode} onValueChange={(value) => updateSettingsFormData('mode', value)}>
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
                        value={settingsFormData.description}
                        onChange={(e) => updateSettingsFormData('description', e.target.value)}
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
                          value={settingsFormData.starts_at}
                          onChange={(e) => updateSettingsFormData('starts_at', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={settingsFormData.timezone} onValueChange={(value) => updateSettingsFormData('timezone', value)}>
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
                        value={settingsFormData.custom_terms}
                        onChange={(e) => updateSettingsFormData('custom_terms', e.target.value)}
                        placeholder="Additional terms and conditions..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="custom_rules">Custom Rules</Label>
                      <Textarea
                        id="custom_rules"
                        value={settingsFormData.custom_rules}
                        onChange={(e) => updateSettingsFormData('custom_rules', e.target.value)}
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
                            value={settingsFormData.capacity}
                            onChange={(e) => updateSettingsFormData('capacity', e.target.value === '' ? 100 : parseInt(e.target.value) || 100)}
                            placeholder="100"
                            className="w-24 text-center"
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        Current participants: <span className="font-medium">{participants.length || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Lead Capture</Label>
                        <p className="text-xs text-gray-500">Collect email addresses for marketing</p>
                      </div>
                      <Switch
                        checked={settingsFormData.lead_capture}
                        onCheckedChange={(checked) => updateSettingsFormData('lead_capture', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Require Payment</Label>
                        <p className="text-xs text-gray-500">Collect entry fees from participants</p>
                      </div>
                      <Switch
                        checked={settingsFormData.requires_payment}
                        onCheckedChange={(checked) => updateSettingsFormData('requires_payment', checked)}
                      />
                    </div>

                    {settingsFormData.requires_payment && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                            <Input
                              id="entry_fee"
                              type="number"
                              min="0"
                              step="0.01"
                              value={settingsFormData.entry_fee === 0 ? '' : settingsFormData.entry_fee}
                              onChange={(e) => updateSettingsFormData('entry_fee', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
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
                              value={settingsFormData.payment_timeout_minutes === 30 && settingsFormData.payment_timeout_minutes === 0 ? '' : settingsFormData.payment_timeout_minutes}
                              onChange={(e) => updateSettingsFormData('payment_timeout_minutes', e.target.value === '' ? 30 : parseInt(e.target.value) || 30)}
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
                        checked={settingsFormData.promo_enabled}
                        onCheckedChange={(checked) => updateSettingsFormData('promo_enabled', checked)}
                      />
                    </div>

                    {settingsFormData.promo_enabled && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="promo_message">Promotional Message</Label>
                          <Textarea
                            id="promo_message"
                            value={settingsFormData.promo_message}
                            onChange={(e) => updateSettingsFormData('promo_message', e.target.value)}
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
                            value={settingsFormData.promo_duration === 0 ? '' : settingsFormData.promo_duration}
                            onChange={(e) => updateSettingsFormData('promo_duration', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
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
                        <p className="text-xs text-gray-500">Event is currently {event?.status}</p>
                      </div>
                      <Badge className={getStatusColor(event?.status || 'active')}>
                        {event?.status?.charAt(0).toUpperCase() + event?.status?.slice(1)}
                      </Badge>
                    </div>

                    <div>
                      <Label>Status Actions</Label>
                      <p className="text-xs text-gray-500 mb-3">Available status transitions</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getAvailableStatusTransitions().map((transition: any) => (
                          <Button
                            key={transition.to}
                            variant={transition.variant}
                            onClick={() => handleStatusChange(transition.to)}
                            disabled={settingsStatusChanging}
                            className="justify-start"
                          >
                            {settingsStatusChanging ? (
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
                          value={getSettingsJoinUrl()}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(getSettingsJoinUrl(), 'Join URL')}
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
                          value={getSettingsResultsUrl()}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(getSettingsResultsUrl(), 'Results URL')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button variant="outline" className="justify-start" onClick={() => window.open(`/dashboard/events/${eventId}/qr`, '_blank')}>
                        <QrCode className="h-4 w-4 mr-2" />
                        Generate QR Code
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Export Participants
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
                            value={settingsDeleteConfirmName}
                            onChange={(e) => setSettingsDeleteConfirmName(e.target.value)}
                            placeholder={event?.name}
                            className="mt-1"
                          />
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              disabled={settingsDeleteConfirmName !== event?.name || settingsDeleting}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Event Permanently
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Event: {event?.name}</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>All participant entries ({participants.length || 0} participants)</li>
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
                                onClick={handleSettingsDelete}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={settingsDeleting}
                              >
                                {settingsDeleting ? (
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
                    </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => loadEventSettings()}
                  disabled={settingsSaving}
                  className="bg-[#f8f7f4] border-[rgba(0,0,0,0.08)] h-11 px-4 rounded-[12px] text-slate-900"
                >
                  Discard Changes
                </Button>

                <Button
                  onClick={handleSettingsSave}
                  disabled={settingsSaving || !settingsFormData.name.trim()}
                  className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white h-11 px-4 rounded-[12px] hover:opacity-90"
                >
                  {settingsSaving ? (
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
        )


      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Event Header - Figma Design */}
        <div className="bg-white border border-gray-200/50 rounded-[20px] p-6 h-[76px] flex items-center justify-between">
          {/* Left Section - Back Button + Title + Status + Date */}
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Link href="/dashboard">
              <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
            </Link>

            {/* Title */}
            <h1 className="text-[32px] font-normal text-slate-900">
              {event.name}
            </h1>

            {/* Status Badge */}
            <div className="bg-[#8B5CF6] text-white px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">
                {event.status.toUpperCase()}
              </span>
            </div>

            {/* Date/Time */}
            <span className="text-slate-600 text-sm">
              {new Date(event.starts_at).toLocaleDateString('en-AU', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="flex items-center gap-3">
            <button className="bg-[#f8f7f4] border border-gray-200 h-9 px-4 rounded-xl flex items-center gap-2 text-sm text-slate-900 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>

            {/* Venue Dropdown */}
            <div className="relative" ref={venueDropdownRef}>
              <button
                onClick={() => setShowVenueDropdown(!showVenueDropdown)}
                className="bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)] rounded-[8px] px-[17px] py-[1px] flex items-center gap-2 w-[200px] h-[44px] hover:bg-[rgba(0,0,0,0.06)] transition-colors"
              >
                <div className="w-6 h-6 bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full flex items-center justify-center">
                  <span className="text-white text-[12px] font-['Arial:Regular',_sans-serif] leading-[16px]">T</span>
                </div>
                <span className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-gray-800 flex-1 text-left">The Royal Hotel</span>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${showVenueDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showVenueDropdown && (
                <div className="absolute top-full right-0 mt-2 w-[280px] bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] shadow-lg z-50 py-2">
                  {/* Venue Info */}
                  <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full flex items-center justify-center">
                        <span className="text-white text-[16px] font-['Arial:Regular',_sans-serif] leading-[20px]">T</span>
                      </div>
                      <div>
                        <div className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 leading-[20px]">The Royal Hotel</div>
                        <div className="text-[12px] text-slate-600 leading-[16px]">admin@gmail.com</div>
                      </div>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-slate-600 hover:bg-gray-50 hover:text-slate-900 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Menu */}
        <TabMenu activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Add Participant Modal */}
      {event && (
        <AddParticipantModal
          isOpen={showAddParticipantModal}
          onOpenChange={setShowAddParticipantModal}
          event={event}
          participants={participants}
          onParticipantAdded={handleParticipantAdded}
        />
      )}

      {/* View All Participants Modal */}
      <ViewAllParticipantsModal
        isOpen={showViewAllParticipantsModal}
        onClose={() => setShowViewAllParticipantsModal(false)}
        participants={participants}
        onToggleClick={handleToggleClick}
        onAddParticipant={() => setShowAddParticipantModal(true)}
      />

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentConfirmModal}
        onClose={cancelPaymentChange}
        onConfirm={confirmPaymentChange}
        participantName={pendingPaymentChange?.participantName || ''}
      />
    </DashboardLayout>
  )
}

export default function EventOverviewPage() {
  return <EventOverviewContent />
}