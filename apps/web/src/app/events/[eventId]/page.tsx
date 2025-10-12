'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { QrCode, BarChart3, Trophy, Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Event {
  id: string
  name: string
  event_date: string
  entry_fee: number
  event_type: 'sweep' | 'calcutta'
  max_participants: number
  status: string
}

export default function EventOverviewPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [event, setEvent] = useState<Event | null>(null)
  const [activeTab, setActiveTab] = useState('control')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()

        if (error) throw error
        setEvent(data)
      } catch (error) {
        console.error('Error fetching event:', error)
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      fetchEvent()
    }
  }, [eventId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="text-[16px] font-['Arial:Regular',_sans-serif] text-slate-600">
          Loading event...
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[24px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
            Event Not Found
          </h1>
          <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-4">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/dashboard">
            <Button className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif]">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'control', label: 'Event Control', icon: Settings },
    { id: 'qr-links', label: 'QR & Links', icon: QrCode },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'results', label: 'Race Results', icon: Trophy },
    { id: 'settings', label: 'Event Settings', icon: Settings },
  ]

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'control':
        return <EventControlTab event={event} />
      case 'qr-links':
        return <QRLinksTab event={event} />
      case 'analytics':
        return <AnalyticsTab event={event} />
      case 'results':
        return <RaceResultsTab event={event} />
      case 'settings':
        return <EventSettingsTab event={event} />
      default:
        return <EventControlTab event={event} />
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Header */}
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-9 h-9 p-0 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-[24px] leading-[32px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900">
                {event.name}
              </h1>
              <p className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-slate-600">
                {event.event_type === 'sweep' ? 'Melbourne Cup Sweep' : 'Melbourne Cup Calcutta'} • {formatEventDate(event.event_date)}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-['Arial:Regular',_sans-serif] ${
              event.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
              event.status === 'active' ? 'bg-green-100 text-green-700' :
              event.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-[rgba(0,0,0,0.08)]">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 pb-4 border-b-2 transition-colors font-['Arial:Regular',_sans-serif] ${
                      activeTab === tab.id
                        ? 'border-[#ff8a00] text-[#ff8a00]'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[14px]">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderTabContent()}
      </div>
    </div>
  )
}

// Tab Components
function EventControlTab({ event }: { event: Event }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Status Card */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-6">
          <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4">
            Event Status
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-['Arial:Regular',_sans-serif] text-slate-600">Status</span>
              <span className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 capitalize">
                {event.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-['Arial:Regular',_sans-serif] text-slate-600">Participants</span>
              <span className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900">
                0 / {event.max_participants}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-['Arial:Regular',_sans-serif] text-slate-600">Entry Fee</span>
              <span className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900">
                ${event.entry_fee.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-6">
          <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Button className="w-full bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[44px] font-['Arial:Regular',_sans-serif]">
              Start Event
            </Button>
            <Button variant="outline" className="w-full bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[44px] font-['Arial:Regular',_sans-serif]">
              Send Invitations
            </Button>
            <Link href={`/live/${event.id}`} target="_blank">
              <Button variant="outline" className="w-full bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[44px] font-['Arial:Regular',_sans-serif]">
                View Live Display
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-6">
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4">
          Participants
        </h3>
        <div className="text-center py-12">
          <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-4">
            No participants yet
          </p>
          <Button className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif]">
            Add Participant
          </Button>
        </div>
      </div>
    </div>
  )
}

function QRLinksTab({ event }: { event: Event }) {
  const eventUrl = `${window.location.origin}/join/${event.id}`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-6">
          <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4">
            QR Code
          </h3>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-48 h-48 bg-[#f8f7f4] rounded-[12px] flex items-center justify-center">
              <QrCode className="w-24 h-24 text-slate-400" />
            </div>
            <p className="text-[12px] font-['Arial:Regular',_sans-serif] text-slate-600 text-center">
              Participants can scan this QR code to join your event
            </p>
            <Button className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif]">
              Download QR Code
            </Button>
          </div>
        </div>

        {/* Share Links Card */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-6">
          <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4">
            Share Links
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[14px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-2 block">
                Event Join Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={eventUrl}
                  readOnly
                  className="flex-1 bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[36px] px-3 font-['Arial:Regular',_sans-serif] text-[14px]"
                />
                <Button className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[8px] h-[36px] px-4 font-['Arial:Regular',_sans-serif]">
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[44px] font-['Arial:Regular',_sans-serif]">
                Share via Email
              </Button>
              <Button variant="outline" className="w-full bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[44px] font-['Arial:Regular',_sans-serif]">
                Share via SMS
              </Button>
              <Button variant="outline" className="w-full bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[44px] font-['Arial:Regular',_sans-serif]">
                Share on Social Media
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalyticsTab({ event }: { event: Event }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] pt-[25px] pb-[1px] px-[25px] flex justify-between items-start">
          <div className="flex flex-col gap-1 flex-1 h-[84px]">
            <p className="text-[14px] leading-[20px] text-slate-600 font-['Arial:Regular',_sans-serif]">Total Participants</p>
            <h3 className="text-[30px] leading-[36px] font-['Arial:Bold',_sans-serif] text-slate-900 font-bold">0</h3>
            <p className="text-[14px] leading-[20px] text-slate-600 font-['Arial:Regular',_sans-serif]">of {event.max_participants}</p>
          </div>
          <div className="w-[36px] h-[36px] rounded-[20px] flex items-center justify-center pt-2 px-2 pb-0">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] pt-[25px] pb-[1px] px-[25px] flex justify-between items-start">
          <div className="flex flex-col gap-1 flex-1 h-[84px]">
            <p className="text-[14px] leading-[20px] text-slate-600 font-['Arial:Regular',_sans-serif]">Total Prize Pool</p>
            <h3 className="text-[30px] leading-[36px] font-['Arial:Bold',_sans-serif] text-slate-900 font-bold">$0</h3>
            <p className="text-[14px] leading-[20px] text-slate-600 font-['Arial:Regular',_sans-serif]">AUD</p>
          </div>
          <div className="w-[36px] h-[36px] rounded-[20px] flex items-center justify-center pt-2 px-2 pb-0">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] pt-[25px] pb-[1px] px-[25px] flex justify-between items-start">
          <div className="flex flex-col gap-1 flex-1 h-[84px]">
            <p className="text-[14px] leading-[20px] text-slate-600 font-['Arial:Regular',_sans-serif]">Completion Rate</p>
            <h3 className="text-[30px] leading-[36px] font-['Arial:Bold',_sans-serif] text-slate-900 font-bold">0%</h3>
            <p className="text-[14px] leading-[20px] text-slate-600 font-['Arial:Regular',_sans-serif]">filled</p>
          </div>
          <div className="w-[36px] h-[36px] rounded-[20px] flex items-center justify-center pt-2 px-2 pb-0">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-6">
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4">
          Participation Over Time
        </h3>
        <div className="h-64 bg-[#f8f7f4] rounded-[12px] flex items-center justify-center">
          <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-slate-600">
            Chart will appear once participants join
          </p>
        </div>
      </div>
    </div>
  )
}

function RaceResultsTab({ event }: { event: Event }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-6">
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4">
          Melbourne Cup Results
        </h3>

        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h4 className="text-[20px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-2">
            Race Not Started
          </h4>
          <p className="text-[16px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-6 max-w-md mx-auto">
            Results will be available here once the Melbourne Cup race has concluded.
            We'll automatically update with the official race results.
          </p>
          <Button className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif]">
            Check Live Results
          </Button>
        </div>
      </div>
    </div>
  )
}

function EventSettingsTab({ event }: { event: Event }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] p-6">
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 mb-4">
          Event Settings
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[14px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-2 block">
                Event Name
              </label>
              <input
                type="text"
                defaultValue={event.name}
                className="w-full bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[36px] px-3 font-['Arial:Regular',_sans-serif] text-[14px]"
              />
            </div>

            <div>
              <label className="text-[14px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-2 block">
                Entry Fee
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue={event.entry_fee}
                className="w-full bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[36px] px-3 font-['Arial:Regular',_sans-serif] text-[14px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[14px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-2 block">
              Maximum Participants
            </label>
            <input
              type="number"
              min="2"
              max="100"
              defaultValue={event.max_participants}
              className="w-full bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[36px] px-3 font-['Arial:Regular',_sans-serif] text-[14px]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif]">
              Save Changes
            </Button>
            <Button variant="outline" className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif]">
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-[20px] p-6">
        <h3 className="text-[18px] leading-[28px] font-['Arial:Bold',_sans-serif] font-bold text-red-600 mb-4">
          Danger Zone
        </h3>
        <p className="text-[14px] font-['Arial:Regular',_sans-serif] text-slate-600 mb-4">
          Once you delete an event, there is no going back. This action cannot be undone.
        </p>
        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-[12px] h-[44px] px-6 font-['Arial:Regular',_sans-serif]">
          Delete Event
        </Button>
      </div>
    </div>
  )
}