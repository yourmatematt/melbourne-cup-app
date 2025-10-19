'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode-generator'
import { Users, Clock, Trophy, Smartphone, Zap } from 'lucide-react'

interface LobbyModeProps {
  event: any
  participants: any[]
  assignments: any[]
  horses: any[]
  onNext: () => void
  onModeChange: (mode: string) => void
}

export function LobbyMode({ event, participants, assignments, horses, onNext }: LobbyModeProps) {
  const [timeUntilRace, setTimeUntilRace] = useState<string>('')
  const [joinUrl, setJoinUrl] = useState<string>('')

  // Calculate time until race
  useEffect(() => {
    const updateCountdown = () => {
      const raceTime = new Date(event.starts_at).getTime()
      const now = new Date().getTime()
      const timeDiff = raceTime - now

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

        if (days > 0) {
          setTimeUntilRace(`${days}d ${hours}h ${minutes}m`)
        } else if (hours > 0) {
          setTimeUntilRace(`${hours}h ${minutes}m ${seconds}s`)
        } else {
          setTimeUntilRace(`${minutes}m ${seconds}s`)
        }
      } else {
        setTimeUntilRace('Race Time!')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [event.starts_at])

  // Set join URL
  useEffect(() => {
    const baseUrl = window.location.origin
    setJoinUrl(`${baseUrl}/events/${event.id}/enter`)
  }, [event.id])

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  const capacityPercentage = event.capacity > 0 ? (participants.length / event.capacity) * 100 : 0
  const isFull = participants.length >= event.capacity

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Background with animated gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600"
        animate={{
          background: [
            'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
            'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c2d12 100%)',
            'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)'
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Content Grid */}
      <div className="relative z-10 flex-1 grid grid-cols-12 grid-rows-12 gap-4 p-8">
        {/* Header - Event Title and Venue */}
        <motion.div
          className="col-span-12 row-span-3 flex flex-col justify-center items-center text-center"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <motion.h1
            className="text-7xl font-bold text-white mb-4 drop-shadow-2xl"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {event.name}
          </motion.h1>
          {event.tenant?.name && (
            <motion.h2
              className="text-3xl text-white/90 font-medium drop-shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              at {event.tenant.name}
            </motion.h2>
          )}
        </motion.div>

        {/* Left Column - QR Code */}
        <motion.div
          className="col-span-5 row-span-6 flex flex-col justify-center items-center"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <div className="bg-white p-8 rounded-3xl shadow-2xl">
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <Smartphone className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-800">Join the Sweep</span>
              </div>
              <p className="text-gray-600 text-lg">Scan with your phone</p>
            </div>

            {joinUrl && (
              <motion.div
                className="flex justify-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div
                  className="bg-white p-4 rounded-lg"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      const qr = QRCode(0, 'M')
                      qr.addData(joinUrl)
                      qr.make()
                      return qr.createSvgTag(4, 8)
                    })()
                  }}
                />
              </motion.div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 break-all font-mono">
                {joinUrl}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Center Column - Stats */}
        <motion.div
          className="col-span-2 row-span-6 flex flex-col justify-center space-y-6"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          {/* Participant Count */}
          <motion.div
            className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0 }}
          >
            <Users className="w-8 h-8 text-white mx-auto mb-3" />
            <div className="text-4xl font-bold text-white mb-2">
              {participants.length}
            </div>
            <div className="text-white/80 text-lg">Participants</div>
            <div className="mt-3 bg-white/20 rounded-full h-3">
              <motion.div
                className="bg-white rounded-full h-3"
                initial={{ width: 0 }}
                animate={{ width: `${capacityPercentage}%` }}
                transition={{ duration: 1, delay: 1 }}
              />
            </div>
            <div className="text-white/70 text-sm mt-2">
              {event.capacity - participants.length} spots left
            </div>
          </motion.div>

          {/* Assignments Count */}
          <motion.div
            className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          >
            <Trophy className="w-8 h-8 text-white mx-auto mb-3" />
            <div className="text-4xl font-bold text-white mb-2">
              {assignments.length}
            </div>
            <div className="text-white/80 text-lg">Assigned</div>
          </motion.div>
        </motion.div>

        {/* Right Column - Event Info */}
        <motion.div
          className="col-span-5 row-span-6 flex flex-col justify-center space-y-6"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          {/* Countdown */}
          <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Clock className="w-10 h-10 text-white" />
              <span className="text-3xl font-bold text-white">Race Countdown</span>
            </div>
            <motion.div
              className="text-6xl font-mono font-bold text-white mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {timeUntilRace}
            </motion.div>
            <div className="text-white/80 text-xl">
              {formatEventDate(event.starts_at)}
            </div>
          </div>

          {/* Event Status */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white text-xl font-semibold">Event Status</span>
              <motion.div
                className="bg-green-500 w-4 h-4 rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-white">
                <span>Mode:</span>
                <span className="font-semibold capitalize">{event.mode}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Status:</span>
                <span className="font-semibold capitalize">{event.status}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Capacity:</span>
                <span className="font-semibold">{participants.length}/{event.capacity}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom - Instructions */}
        <motion.div
          className="col-span-12 row-span-3 flex flex-col justify-center items-center"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <div className="text-center space-y-4">
            {!isFull ? (
              <>
                <motion.div
                  className="flex items-center justify-center space-x-4 text-white text-2xl"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Smartphone className="w-8 h-8" />
                  <span>Scan the QR code to join the Melbourne Cup sweep!</span>
                  <Smartphone className="w-8 h-8" />
                </motion.div>
                <div className="text-white/80 text-xl">
                  Get your horse assigned and win amazing prizes!
                </div>
              </>
            ) : (
              <motion.div
                className="flex items-center justify-center space-x-4 text-white text-3xl font-bold"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-10 h-10" />
                <span>Event Full - Ready for Draw!</span>
                <Zap className="w-10 h-10" />
              </motion.div>
            )}

            <div className="text-white/60 text-lg">
              Press SPACE to start the draw | Press F for fullscreen
            </div>
          </div>
        </motion.div>
      </div>

      {/* Animated particles overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}