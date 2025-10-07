'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Users, ChevronLeft, ChevronRight, Play, Sparkles } from 'lucide-react'

interface DrawModeProps {
  event: any
  participants: any[]
  assignments: any[]
  horses: any[]
  currentDrawIndex: number
  onNext: () => void
  onPrevious: () => void
  onShowConfetti: () => void
}

export function DrawMode({
  event,
  participants,
  assignments,
  horses,
  currentDrawIndex,
  onNext,
  onPrevious,
  onShowConfetti
}: DrawModeProps) {
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [isRevealing, setIsRevealing] = useState(false)
  const [showReveal, setShowReveal] = useState(false)

  const currentAssignment = assignments[currentDrawIndex]
  const participant = currentAssignment
    ? participants.find(p => p.id === currentAssignment.patron_entry_id)
    : null
  const horse = currentAssignment
    ? horses.find(h => h.id === currentAssignment.event_horse_id)
    : null

  const startReveal = () => {
    setShowCountdown(true)
    setCountdown(3)

    // Countdown animation
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setShowCountdown(false)
          setIsRevealing(true)

          // Start reveal animation
          setTimeout(() => {
            setShowReveal(true)
            onShowConfetti()
          }, 500)

          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Reset reveal state when assignment changes
  useEffect(() => {
    setShowReveal(false)
    setIsRevealing(false)
    setShowCountdown(false)
  }, [currentDrawIndex])

  const formatAssignmentTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (!currentAssignment || !participant || !horse) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-4xl font-bold mb-2">No More Draws</h1>
          <p className="text-xl text-gray-400">All participants have been assigned!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, rgba(120, 53, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 0, 150, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 20%, rgba(120, 53, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, rgba(120, 53, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 0, 150, 0.3) 0%, transparent 50%)'
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Spotlight effect */}
      <motion.div
        className="absolute inset-0 bg-black/60"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.8) 70%)`
        }}
        animate={isRevealing ? {
          background: [
            'radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.8) 70%)',
            'radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.4) 80%)',
            'radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.8) 70%)'
          ]
        } : {}}
        transition={{ duration: 2, repeat: isRevealing ? Infinity : 0 }}
      />

      {/* Header */}
      <motion.div
        className="relative z-10 text-center py-8"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.h1
          className="text-6xl font-bold text-white mb-4 drop-shadow-2xl"
          animate={{
            textShadow: [
              '0 0 20px rgba(255,255,255,0.5)',
              '0 0 40px rgba(255,215,0,0.8)',
              '0 0 20px rgba(255,255,255,0.5)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          THE DRAW
        </motion.h1>
        <div className="flex items-center justify-center space-x-4 text-white/80 text-xl">
          <span>Draw {currentDrawIndex + 1} of {assignments.length}</span>
          <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
          <span>{formatAssignmentTime(currentAssignment.created_at)}</span>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="relative z-20 flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-6xl">
          {/* Countdown Overlay */}
          <AnimatePresence>
            {showCountdown && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center z-50 bg-black/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="text-9xl font-bold text-white"
                  key={countdown}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {countdown}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-16 items-center">
            {/* Participant Card */}
            <motion.div
              className="text-center"
              initial={{ x: -100, opacity: 0, rotateY: -90 }}
              animate={{
                x: 0,
                opacity: 1,
                rotateY: showReveal ? 0 : -90
              }}
              transition={{
                duration: 1,
                delay: showReveal ? 0 : 0.5,
                type: "spring",
                stiffness: 100
              }}
            >
              <motion.div
                className="relative perspective-1000"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-8 shadow-2xl border-4 border-white/20 relative overflow-hidden"
                  animate={showReveal ? {
                    boxShadow: [
                      '0 0 30px rgba(59, 130, 246, 0.5)',
                      '0 0 60px rgba(59, 130, 246, 0.8)',
                      '0 0 30px rgba(59, 130, 246, 0.5)'
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: showReveal ? Infinity : 0 }}
                >
                  {/* Sparkle effects */}
                  {showReveal && (
                    <>
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-white rounded-full"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                          }}
                          animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                          }}
                        />
                      ))}
                    </>
                  )}

                  <Users className="w-16 h-16 text-white mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">PARTICIPANT</h2>
                  <div className="text-5xl font-bold text-white mb-4">
                    {participant.participant_name}
                  </div>
                  <div className="bg-white/20 rounded-full px-6 py-2 inline-block">
                    <span className="text-white font-mono text-xl">
                      {participant.join_code}
                    </span>
                  </div>
                  {participant.email && (
                    <div className="mt-4 text-white/80 text-lg">
                      {participant.email}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Versus Indicator */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
              <motion.div
                className="text-center"
                animate={showReveal ? {
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0],
                } : {}}
                transition={{ duration: 1, repeat: showReveal ? Infinity : 0 }}
              >
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-6 shadow-2xl">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <motion.div
                  className="text-2xl font-bold text-white mt-4 drop-shadow-lg"
                  animate={showReveal ? { opacity: [0.7, 1, 0.7] } : {}}
                  transition={{ duration: 1.5, repeat: showReveal ? Infinity : 0 }}
                >
                  GETS
                </motion.div>
              </motion.div>
            </div>

            {/* Horse Card */}
            <motion.div
              className="text-center"
              initial={{ x: 100, opacity: 0, rotateY: 90 }}
              animate={{
                x: 0,
                opacity: 1,
                rotateY: showReveal ? 0 : 90
              }}
              transition={{
                duration: 1,
                delay: showReveal ? 0.3 : 0.5,
                type: "spring",
                stiffness: 100
              }}
            >
              <motion.div
                className="relative perspective-1000"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-red-500 to-red-700 rounded-3xl p-8 shadow-2xl border-4 border-white/20 relative overflow-hidden"
                  animate={showReveal ? {
                    boxShadow: [
                      '0 0 30px rgba(239, 68, 68, 0.5)',
                      '0 0 60px rgba(239, 68, 68, 0.8)',
                      '0 0 30px rgba(239, 68, 68, 0.5)'
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: showReveal ? Infinity : 0 }}
                >
                  {/* Sparkle effects */}
                  {showReveal && (
                    <>
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-white rounded-full"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                          }}
                          animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                          }}
                        />
                      ))}
                    </>
                  )}

                  <Trophy className="w-16 h-16 text-white mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">HORSE</h2>
                  <div className="text-6xl font-bold text-white mb-2">
                    #{horse.number}
                  </div>
                  <div className="text-3xl font-bold text-white mb-4">
                    {horse.name}
                  </div>
                  {horse.jockey && (
                    <div className="bg-white/20 rounded-full px-6 py-2 inline-block mb-2">
                      <span className="text-white text-lg">
                        Jockey: {horse.jockey}
                      </span>
                    </div>
                  )}
                  {horse.trainer && (
                    <div className="text-white/80 text-lg">
                      Trainer: {horse.trainer}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-center space-x-6">
          {/* Previous */}
          <motion.button
            className={`p-4 rounded-full transition-all ${
              currentDrawIndex > 0
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            }`}
            onClick={onPrevious}
            disabled={currentDrawIndex <= 0}
            whileHover={currentDrawIndex > 0 ? { scale: 1.1 } : {}}
            whileTap={currentDrawIndex > 0 ? { scale: 0.95 } : {}}
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>

          {/* Reveal Button */}
          <motion.button
            className={`px-8 py-4 rounded-full font-bold text-xl transition-all ${
              showReveal
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg'
            }`}
            onClick={showReveal ? onNext : startReveal}
            disabled={isRevealing && !showReveal}
            whileHover={!showReveal ? { scale: 1.05 } : {}}
            whileTap={!showReveal ? { scale: 0.95 } : {}}
            animate={!showReveal ? {
              boxShadow: [
                '0 0 20px rgba(245, 158, 11, 0.5)',
                '0 0 40px rgba(245, 158, 11, 0.8)',
                '0 0 20px rgba(245, 158, 11, 0.5)'
              ]
            } : {}}
            transition={{ duration: 2, repeat: !showReveal ? Infinity : 0 }}
          >
            {showReveal ? (
              <div className="flex items-center space-x-2">
                <ChevronRight className="w-6 h-6" />
                <span>Next Draw</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Play className="w-6 h-6" />
                <span>Reveal Match</span>
              </div>
            )}
          </motion.button>

          {/* Next */}
          <motion.button
            className={`p-4 rounded-full transition-all ${
              currentDrawIndex < assignments.length - 1
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            }`}
            onClick={onNext}
            disabled={currentDrawIndex >= assignments.length - 1}
            whileHover={currentDrawIndex < assignments.length - 1 ? { scale: 1.1 } : {}}
            whileTap={currentDrawIndex < assignments.length - 1 ? { scale: 0.95 } : {}}
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </div>
      </motion.div>

      {/* Side Panel - All Assignments */}
      <motion.div
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-80 max-h-96 overflow-y-auto bg-black/50 backdrop-blur-sm rounded-xl p-4"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-white font-bold text-lg mb-4 text-center">All Assignments</h3>
        <div className="space-y-2">
          {assignments.map((assignment, index) => {
            const assignedParticipant = participants.find(p => p.id === assignment.patron_entry_id)
            const assignedHorse = horses.find(h => h.id === assignment.event_horse_id)
            const isCurrent = index === currentDrawIndex

            return (
              <motion.div
                key={assignment.id}
                className={`p-3 rounded-lg text-sm transition-all ${
                  isCurrent
                    ? 'bg-yellow-500/30 border border-yellow-400'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                animate={isCurrent ? {
                  boxShadow: [
                    '0 0 10px rgba(245, 158, 11, 0.3)',
                    '0 0 20px rgba(245, 158, 11, 0.6)',
                    '0 0 10px rgba(245, 158, 11, 0.3)'
                  ]
                } : {}}
                transition={{ duration: 2, repeat: isCurrent ? Infinity : 0 }}
              >
                <div className="text-white font-medium">{assignedParticipant?.participant_name}</div>
                <div className="text-yellow-300 text-xs">
                  #{assignedHorse?.number} {assignedHorse?.name}
                </div>
                <div className="text-white/60 text-xs">
                  {formatAssignmentTime(assignment.created_at)}
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Mode indicator */}
      <motion.div
        className="absolute top-8 left-8 bg-purple-600/80 backdrop-blur-sm rounded-full px-6 py-3 text-white font-bold"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        DRAW MODE
      </motion.div>
    </div>
  )
}