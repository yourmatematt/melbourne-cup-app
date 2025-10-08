'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface RegistrationData {
  id: string
  joinCode: string
  name: string
  paymentStatus: 'pending' | 'paid' | 'expired'
  paymentDeadline: string | null
  paymentAmount: number
  requiresPayment: boolean
  promo: {
    enabled: boolean
    message: string | null
    deadline: string | null
    duration: number
  }
  event: {
    id: string
    name: string
    entryFee: number
    paymentTimeoutMinutes: number
  }
}

interface CountdownProps {
  deadline: string
  onExpired: () => void
  label?: string
  colorScheme?: 'orange' | 'red' | 'green'
}

interface PromoCountdownProps {
  promoDeadline: string
  paymentDeadline: string
  onPromoExpired: () => void
  onPaymentExpired: () => void
}

function CountdownTimer({ deadline, onExpired, label = 'remaining', colorScheme = 'orange' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

  const colorClasses = {
    orange: 'text-orange-600',
    red: 'text-red-600',
    green: 'text-green-600'
  }

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const deadlineTime = new Date(deadline).getTime()
      const difference = deadlineTime - now

      if (difference <= 0) {
        setIsExpired(true)
        setTimeLeft('Expired')
        onExpired()
        return
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [deadline, onExpired])

  if (isExpired) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <span className="font-semibold">Time Expired</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${colorClasses[colorScheme]}`}>
      <Clock className="h-5 w-5" />
      <span className="font-mono text-2xl font-bold">{timeLeft}</span>
      <span className="text-sm">{label}</span>
    </div>
  )
}

function PromoCountdownTimer({ promoDeadline, paymentDeadline, onPromoExpired, onPaymentExpired }: PromoCountdownProps) {
  const [promoExpired, setPromoExpired] = useState(false)
  const [paymentExpired, setPaymentExpired] = useState(false)

  const handlePromoExpired = () => {
    setPromoExpired(true)
    onPromoExpired()
  }

  const handlePaymentExpired = () => {
    setPaymentExpired(true)
    onPaymentExpired()
  }

  if (paymentExpired) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center justify-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="h-6 w-6" />
          <span className="font-semibold text-lg">Reservation Expired</span>
        </div>
        <p className="text-red-700 text-sm">Your payment window has closed</p>
      </div>
    )
  }

  if (promoExpired) {
    return (
      <div className="space-y-3">
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-center space-x-2 text-yellow-700 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Promotional offer has expired</span>
          </div>
          <p className="text-yellow-600 text-sm">But you can still secure your entry!</p>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border border-orange-200">
          <p className="text-sm text-gray-600 mb-2">Time remaining to pay:</p>
          <CountdownTimer
            deadline={paymentDeadline}
            onExpired={handlePaymentExpired}
            label="remaining"
            colorScheme="orange"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="text-center p-4 bg-white rounded-lg border border-green-300">
      <p className="text-sm text-gray-600 mb-2">Promotional offer expires in:</p>
      <CountdownTimer
        deadline={promoDeadline}
        onExpired={handlePromoExpired}
        label="for offer"
        colorScheme="green"
      />
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 flex items-center justify-center space-x-2">
          <span>Reservation expires in:</span>
          <span className="font-mono text-orange-600 font-semibold">{new Date(paymentDeadline).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>
        </p>
      </div>
    </div>
  )
}

export default function RegistrationSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string

  // Get registration data from URL params (passed from registration form)
  const registrationData: RegistrationData | null = searchParams.get('data')
    ? JSON.parse(decodeURIComponent(searchParams.get('data')!))
    : null

  const [isExpired, setIsExpired] = useState(false)
  const [promoExpired, setPromoExpired] = useState(false)

  const handleExpired = () => {
    setIsExpired(true)
    toast.error('Your reservation has expired. Please register again if spots are still available.')
  }

  const handlePromoExpired = () => {
    setPromoExpired(true)
    toast.info('Promotional offer has expired, but you can still secure your entry!')
  }

  const handleCopyJoinCode = () => {
    if (registrationData?.joinCode) {
      navigator.clipboard.writeText(registrationData.joinCode)
      toast.success('Join code copied to clipboard!')
    }
  }

  if (!registrationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Registration Not Found</CardTitle>
            <CardDescription>
              No registration data found. Please register again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href={`/events/${eventId}/enter`}>
              <Button>
                <ExternalLink className="h-4 w-4 mr-2" />
                Register Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPaid = registrationData.paymentStatus === 'paid'
  const isPending = registrationData.paymentStatus === 'pending'
  const showCountdown = isPending && registrationData.paymentDeadline && !isExpired
  const showPromo = registrationData.promo?.enabled && registrationData.promo.message && isPending && !isExpired

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Success Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPaid ? 'Registration Complete!' : 'Spot Reserved!'}
          </h1>
          <p className="text-lg text-gray-600">
            Welcome to {registrationData.event.name}
          </p>
        </div>

        {/* Promotional Offer Card */}
        {showPromo && registrationData.promo.deadline && (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2 text-green-800">
                <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold">
                  ⭐
                </div>
                <CardTitle className="text-xl">SPECIAL OFFER!</CardTitle>
              </div>
              <CardDescription className="text-green-700 text-lg font-medium">
                {registrationData.promo.message}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromoCountdownTimer
                promoDeadline={registrationData.promo.deadline}
                paymentDeadline={registrationData.paymentDeadline!}
                onPromoExpired={handlePromoExpired}
                onPaymentExpired={handleExpired}
              />
              <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 text-green-800">
                  <span className="font-semibold">Your Join Code:</span>
                  <Badge variant="secondary" className="font-mono text-lg bg-white border-green-300">
                    {registrationData.joinCode}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyJoinCode}
                    className="ml-auto border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  Show this code at the bar to claim your offer and secure your entry!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Status Card */}
        {isPending && !isExpired && !showPromo && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-800">
                <Clock className="h-5 w-5" />
                <span>Payment Required</span>
              </CardTitle>
              <CardDescription className="text-orange-700">
                Your spot is reserved for a limited time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCountdown && registrationData.paymentDeadline && (
                <div className="text-center p-4 bg-white rounded-lg border">
                  <CountdownTimer
                    deadline={registrationData.paymentDeadline}
                    onExpired={handleExpired}
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="font-semibold text-orange-800">
                  Show this code at the bar and pay ${registrationData.paymentAmount} to secure your entry:
                </p>
                <div className="flex items-center justify-between p-3 bg-white rounded border-2 border-orange-300">
                  <span className="font-mono text-2xl font-bold text-gray-900">
                    {registrationData.joinCode}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyJoinCode}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Your spot will be released if payment isn't received within the time limit.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paid Status Card */}
        {isPaid && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span>Registration Complete</span>
              </CardTitle>
              <CardDescription className="text-green-700">
                You're all set for the event!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-white rounded border-2 border-green-300">
                <span className="font-mono text-2xl font-bold text-gray-900">
                  {registrationData.joinCode}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyJoinCode}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired Card */}
        {isExpired && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span>Reservation Expired</span>
              </CardTitle>
              <CardDescription className="text-red-700">
                Your payment deadline has passed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-red-800">
                Your reservation has expired. Please register again if spots are still available.
              </p>
              <Link href={`/events/${eventId}/enter`}>
                <Button className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Register Again
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Event Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Event Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <strong>Event:</strong>
              <span>{registrationData.event.name}</span>
            </div>

            <div className="flex items-center space-x-2">
              <strong>Your Name:</strong>
              <span>{registrationData.name}</span>
            </div>

            <div className="flex items-center space-x-2">
              <strong>Join Code:</strong>
              <Badge variant="secondary" className="font-mono">
                {registrationData.joinCode}
              </Badge>
            </div>

            {registrationData.requiresPayment && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <strong>Entry Fee:</strong>
                <span>${registrationData.paymentAmount}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isPending && !isExpired && (
                <>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">1</div>
                    <p>Head to the bar and show your join code: <strong>{registrationData.joinCode}</strong></p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">2</div>
                    <p>Pay your entry fee of <strong>${registrationData.paymentAmount}</strong></p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">3</div>
                    <p>Staff will confirm your payment and you're all set! Keep your join code handy for the draw.</p>
                  </div>
                </>
              )}

              {isPaid && (
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  <p>You're all set! Watch for the draw results and good luck!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/events/${eventId}/live`}>
            <Button variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Live Results
            </Button>
          </Link>

          <Link href={`/events/${eventId}/enter`}>
            <Button variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}