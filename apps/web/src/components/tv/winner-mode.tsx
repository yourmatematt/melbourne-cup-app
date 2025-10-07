'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Trophy, Star, Sparkles, Gift, DollarSign, Medal, Zap } from 'lucide-react'

interface WinnerModeProps {
  event: any
  participants: any[]
  assignments: any[]
  horses: any[]
  winners: any[]
  onModeChange: (mode: string) => void
  onShowConfetti: () => void
}

export function WinnerMode({
  event,
  participants,
  assignments,
  horses,
  winners,
  onShowConfetti
}: WinnerModeProps) {
  const [showWinnerReveal, setShowWinnerReveal] = useState(false)
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0)

  // Get winner details
  const winner = winners[currentWinnerIndex]
  const winnerAssignment = winner?.assignment
  const winnerParticipant = winnerAssignment?.patron_entry
  const winnerHorse = winnerAssignment?.event_horse

  useEffect(() => {
    // Trigger confetti and reveal after a short delay
    const timer = setTimeout(() => {
      setShowWinnerReveal(true)
      onShowConfetti()
    }, 1000)

    return () => clearTimeout(timer)
  }, [onShowConfetti])

  // Cycle through multiple winners if available
  useEffect(() => {
    if (winners.length > 1) {
      const interval = setInterval(() => {
        setCurrentWinnerIndex(prev => (prev + 1) % winners.length)
        onShowConfetti()
      }, 10000) // Change winner every 10 seconds

      return () => clearInterval(interval)
    }
  }, [winners.length, onShowConfetti])

  if (!winner || !winnerParticipant || !winnerHorse) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-4xl font-bold mb-2">No Winner Yet</h1>
          <p className="text-xl text-gray-400">The race hasn't finished!</p>
        </div>
      </div>
    )
  }

  const formatPrize = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600"
        animate={{
          background: [
            'linear-gradient(135deg, #fbbf24 0%, #f97316 30%, #dc2626 60%, #7c2d12 100%)',
            'linear-gradient(135deg, #fcd34d 0%, #fb923c 30%, #ef4444 60%, #991b1b 100%)',
            'linear-gradient(135deg, #fde047 0%, #fdba74 30%, #f87171 60%, #7f1d1d 100%)',
            'linear-gradient(135deg, #fbbf24 0%, #f97316 30%, #dc2626 60%, #7c2d12 100%)'
          ]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Golden rays effect */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 bg-gradient-to-t from-transparent via-yellow-300/30 to-transparent origin-bottom"
            style={{
              height: '50vh',
              transform: `rotate(${i * 30}deg)`,
              transformOrigin: 'bottom center'
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scaleY: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              rotate: [0, 360],
              scale: [0.5, 1, 0.5],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
          >
            {i % 4 === 0 && <Crown className="w-6 h-6 text-yellow-300" />}
            {i % 4 === 1 && <Trophy className="w-6 h-6 text-yellow-300" />}
            {i % 4 === 2 && <Star className="w-6 h-6 text-yellow-300" />}
            {i % 4 === 3 && <Sparkles className="w-6 h-6 text-yellow-300" />}
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-8">
        {/* Crown Animation */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={showWinnerReveal ? { scale: 1, rotate: 0 } : {}}
          transition={{ type: "spring", stiffness: 150, damping: 10, delay: 0.5 }}
        >
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown className="w-32 h-32 text-yellow-300 drop-shadow-2xl" />
          </motion.div>
        </motion.div>

        {/* Winner Title */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={showWinnerReveal ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mb-8"
        >
          <motion.h1
            className="text-9xl font-bold text-white drop-shadow-2xl mb-4"
            animate={{
              textShadow: [
                '0 0 30px rgba(255,255,255,0.8)',
                '0 0 60px rgba(255,215,0,1)',
                '0 0 30px rgba(255,255,255,0.8)'
              ],
              scale: [1, 1.02, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            WINNER!
          </motion.h1>

          {winner.position === 1 && (
            <motion.div
              className="flex items-center justify-center space-x-4 text-4xl font-bold text-yellow-300"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Medal className="w-12 h-12" />
              <span>1ST PLACE</span>
              <Medal className="w-12 h-12" />
            </motion.div>
          )}
        </motion.div>

        {/* Winner Details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWinnerIndex}
            initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
            animate={showWinnerReveal ? { scale: 1, opacity: 1, rotateY: 0 } : {}}
            exit={{ scale: 0.8, opacity: 0, rotateY: 90 }}
            transition={{ delay: 1.2, duration: 1, type: "spring", stiffness: 100 }}
            className="bg-black/30 backdrop-blur-sm rounded-3xl p-12 border-4 border-yellow-400/50 mb-8 relative overflow-hidden"
          >
            {/* Sparkle overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            <motion.div
              className="relative z-10"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="text-6xl font-bold text-white mb-4">
                {winnerParticipant.participant_name}
              </div>

              <div className="flex items-center justify-center space-x-6 mb-6">
                <div className="bg-white/20 rounded-2xl px-6 py-3">
                  <div className="text-yellow-300 text-sm font-medium mb-1">Join Code</div>
                  <div className="text-white font-mono text-2xl">
                    {winnerParticipant.join_code}
                  </div>
                </div>

                {winnerParticipant.email && (
                  <div className="bg-white/20 rounded-2xl px-6 py-3">
                    <div className="text-yellow-300 text-sm font-medium mb-1">Email</div>
                    <div className="text-white text-xl">
                      {winnerParticipant.email}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center space-x-8 mb-6">
                <motion.div
                  className="text-center"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
                  <div className="text-yellow-300 text-lg font-medium">Winning Horse</div>
                  <div className="text-4xl font-bold text-white">
                    #{winnerHorse.number}
                  </div>
                  <div className="text-2xl text-white font-semibold">
                    {winnerHorse.name}
                  </div>
                  {winnerHorse.jockey && (
                    <div className="text-lg text-white/80 mt-2">
                      Jockey: {winnerHorse.jockey}
                    </div>
                  )}
                </motion.div>

                {winner.prize_amount > 0 && (
                  <motion.div
                    className="text-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                  >
                    <Gift className="w-16 h-16 text-green-400 mx-auto mb-2" />
                    <div className="text-green-300 text-lg font-medium">Prize</div>
                    <div className="text-5xl font-bold text-green-400">
                      {formatPrize(winner.prize_amount)}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Event Info */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={showWinnerReveal ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="text-center"
        >
          <div className="text-3xl font-bold text-white mb-2">
            🏆 {event.name} Champion 🏆
          </div>
          {event.tenant?.name && (
            <div className="text-xl text-white/80">
              at {event.tenant.name}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center space-x-8 text-white/60">
            <div className="text-center">
              <div className="text-2xl font-bold">{participants.length}</div>
              <div className="text-sm">Total Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{horses.length}</div>
              <div className="text-sm">Horses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{assignments.length}</div>
              <div className="text-sm">Assignments</div>
            </div>
          </div>
        </motion.div>

        {/* Multiple Winners Indicator */}
        {winners.length > 1 && (
          <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
          >
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-6 py-3 text-white">
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>Winner {currentWinnerIndex + 1} of {winners.length}</span>
                <div className="flex space-x-1">
                  {winners.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentWinnerIndex ? 'bg-yellow-400' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mode indicator */}
      <motion.div
        className="absolute top-8 left-8 bg-yellow-600/80 backdrop-blur-sm rounded-full px-6 py-3 text-white font-bold"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        animate={{
          boxShadow: [
            '0 0 20px rgba(202, 138, 4, 0.5)',
            '0 0 30px rgba(202, 138, 4, 0.8)',
            '0 0 20px rgba(202, 138, 4, 0.5)'
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🏆 WINNER MODE
      </motion.div>

      {/* Celebration Message */}
      <motion.div
        className="absolute bottom-20 right-8 bg-black/40 backdrop-blur-sm rounded-xl p-4 text-white max-w-sm"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <div className="font-bold text-lg mb-1">Congratulations!</div>
          <div className="text-sm text-white/80">
            Thank you for participating in the Melbourne Cup sweep!
          </div>
        </div>
      </motion.div>
    </div>
  )
}