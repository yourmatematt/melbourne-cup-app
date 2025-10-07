'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle,
  Copy,
  Share2,
  Calendar,
  Users,
  Trophy,
  MapPin,
  Clock
} from 'lucide-react'
import { useState } from 'react'

interface ConfirmationScreenProps {
  event: any
  patronEntry: any
  onContinue: () => void
}

export function ConfirmationScreen({ event, patronEntry, onContinue }: ConfirmationScreenProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(patronEntry.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: `${event.name} - Melbourne Cup Sweep`,
      text: `I just joined the ${event.name} sweep at ${event.tenant?.name}! My join code: ${patronEntry.join_code}`,
      url: window.location.origin + window.location.pathname
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              You're In! 🎉
            </h1>
            <p className="text-gray-600">
              Welcome to the {event.name} sweep, {patronEntry.participant_name}!
            </p>
          </div>
        </div>

        {/* Join Code Card */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-lg text-green-800">Your Join Code</CardTitle>
            <CardDescription>
              Save this code - you'll need it to check your horse and results
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="bg-white border-2 border-dashed border-green-300 rounded-lg p-4 mb-4">
                <div className="text-3xl font-mono font-bold text-green-800 tracking-wider">
                  {patronEntry.join_code}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJoinCode}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Code'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>Event Details</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Calendar className="w-4 h-4 text-gray-500 mt-1" />
                <div>
                  <p className="font-medium text-sm">Race Time</p>
                  <p className="text-sm text-gray-600">{formatEventDate(event.starts_at)}</p>
                </div>
              </div>

              {event.tenant?.name && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="font-medium text-sm">Venue</p>
                    <p className="text-sm text-gray-600">{event.tenant.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3">
                <Users className="w-4 h-4 text-gray-500 mt-1" />
                <div>
                  <p className="font-medium text-sm">Event Type</p>
                  <Badge variant="outline" className="capitalize">
                    {event.mode}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>What's Next?</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                <p>The draw will begin closer to race time</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                <p>You'll be randomly assigned a horse</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                <p>Watch the race and see if you win!</p>
              </div>
            </div>

            <Separator />

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Keep this page open or bookmark it to check your horse assignment and follow the results live.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          className="w-full text-lg py-6"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          Continue to Waiting Room
        </Button>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            Questions? Contact {event.tenant?.name} for assistance.
          </p>
        </div>
      </div>
    </div>
  )
}