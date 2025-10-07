'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, Volume2, VolumeX, Play, Pause, SkipForward } from 'lucide-react'

interface ShuffleModeProps {
  event: any
  participants: any[]
  assignments: any[]
  horses: any[]
  musicEnabled: boolean
  onNext: () => void
  onModeChange: (mode: string) => void
  onShowConfetti: () => void
}

interface Card {
  id: string
  type: 'participant' | 'horse'
  data: any
  x: number
  y: number
  rotation: number
  zIndex: number
}

export function ShuffleMode({
  event,
  participants,
  assignments,
  horses,
  musicEnabled,
  onNext,
  onShowConfetti
}: ShuffleModeProps) {
  const [isShuffling, setIsShuffling] = useState(false)
  const [shuffleProgress, setShuffleProgress] = useState(0)
  const [cards, setCards] = useState<Card[]>([])
  const [showInstructions, setShowInstructions] = useState(true)

  // Initialize cards
  useEffect(() => {
    const unassignedParticipants = participants.filter(p =>
      !assignments.some(a => a.patron_entry_id === p.id)
    )
    const availableHorses = horses.filter(h =>
      !h.is_scratched && !assignments.some(a => a.event_horse_id === h.id)
    )

    const participantCards: Card[] = unassignedParticipants.map((participant, index) => ({
      id: `participant-${participant.id}`,
      type: 'participant',
      data: participant,
      x: 100 + (index % 6) * 180,
      y: 150,
      rotation: Math.random() * 10 - 5,
      zIndex: index
    }))

    const horseCards: Card[] = availableHorses.map((horse, index) => ({
      id: `horse-${horse.id}`,
      type: 'horse',
      data: horse,
      x: 100 + (index % 6) * 180,
      y: 400,
      rotation: Math.random() * 10 - 5,
      zIndex: index + 100
    }))

    setCards([...participantCards, ...horseCards])
  }, [participants, assignments, horses])

  const startShuffle = async () => {
    setIsShuffling(true)
    setShowInstructions(false)
    setShuffleProgress(0)

    // Show confetti at start
    onShowConfetti()

    // Animate cards in a shuffling pattern
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        setCards(prevCards =>
          prevCards.map(card => ({
            ...card,
            x: Math.random() * (window.innerWidth - 200) + 100,
            y: Math.random() * (window.innerHeight - 300) + 150,
            rotation: Math.random() * 360,
            zIndex: Math.floor(Math.random() * 1000)
          }))
        )
        setShuffleProgress((i + 1) / 8 * 100)
      }, i * 500)
    }

    // Complete shuffle after animation
    setTimeout(() => {
      setIsShuffling(false)
      setShuffleProgress(100)

      // Show final confetti
      setTimeout(() => {
        onShowConfetti()
      }, 500)
    }, 4000)
  }

  const canShuffle = participants.length > 0 && horses.filter(h => !h.is_scratched).length > 0

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
        animate={{
          background: [
            'linear-gradient(135deg, #581c87 0%, #1e3a8a 50%, #312e81 100%)',
            'linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #4338ca 100%)',
            'linear-gradient(135deg, #581c87 0%, #1e3a8a 50%, #312e81 100%)'
          ]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        className="relative z-10 text-center py-8"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.h1
          className="text-8xl font-bold text-white mb-4 drop-shadow-2xl"
          animate={{
            textShadow: [
              '0 0 20px rgba(255,255,255,0.5)',
              '0 0 40px rgba(255,255,255,0.8)',
              '0 0 20px rgba(255,255,255,0.5)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Shuffle className="inline-block w-16 h-16 mr-4" />
          SHUFFLE TIME
        </motion.h1>
        <motion.p
          className="text-3xl text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Mixing up the horses and participants!
        </motion.p>
      </motion.div>

      {/* Cards Container */}
      <div className="relative z-20 h-full">
        <AnimatePresence>
          {cards.map((card) => (
            <motion.div
              key={card.id}
              className="absolute"
              initial={{ scale: 0, rotation: 0 }}
              animate={{
                x: card.x,
                y: card.y,
                rotation: card.rotation,
                scale: 1,
                zIndex: card.zIndex
              }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                duration: 0.5
              }}
              whileHover={{ scale: 1.05, zIndex: 1000 }}
            >
              {card.type === 'participant' ? (
                <motion.div
                  className="w-40 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-xl border-2 border-white/20 flex items-center justify-center"
                  animate={isShuffling ? {
                    rotateY: [0, 180, 360],
                    scale: [1, 0.8, 1]
                  } : {}}
                  transition={{ duration: 1, repeat: isShuffling ? Infinity : 0 }}
                >
                  <div className="text-center text-white">
                    <div className="font-bold text-sm">{card.data.participant_name}</div>
                    <div className="text-xs opacity-75">{card.data.join_code}</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="w-40 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-lg shadow-xl border-2 border-white/20 flex items-center justify-center"
                  animate={isShuffling ? {
                    rotateY: [0, 180, 360],
                    scale: [1, 0.8, 1]
                  } : {}}
                  transition={{ duration: 1.2, repeat: isShuffling ? Infinity : 0 }}
                >
                  <div className="text-center text-white">
                    <div className="font-bold text-sm">#{card.data.number}</div>
                    <div className="text-xs">{card.data.name}</div>
                    {card.data.jockey && (
                      <div className="text-xs opacity-75">{card.data.jockey}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <motion.div
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-center space-x-6">
          {/* Music Toggle */}
          <motion.button
            className="bg-white/20 backdrop-blur-sm p-4 rounded-full text-white hover:bg-white/30 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // Toggle music logic would go here
            }}
          >
            {musicEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </motion.button>

          {/* Shuffle Button */}
          <motion.button
            className={`px-8 py-4 rounded-full text-white font-bold text-xl transition-all ${
              isShuffling
                ? 'bg-orange-500 cursor-not-allowed'
                : canShuffle
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg'
                : 'bg-gray-500 cursor-not-allowed'
            }`}
            disabled={isShuffling || !canShuffle}
            onClick={startShuffle}
            whileHover={canShuffle && !isShuffling ? { scale: 1.05 } : {}}
            whileTap={canShuffle && !isShuffling ? { scale: 0.95 } : {}}
            animate={isShuffling ? {
              boxShadow: [
                '0 0 20px rgba(34, 197, 94, 0.5)',
                '0 0 40px rgba(34, 197, 94, 0.8)',
                '0 0 20px rgba(34, 197, 94, 0.5)'
              ]
            } : {}}
            transition={{ duration: 1, repeat: isShuffling ? Infinity : 0 }}
          >
            {isShuffling ? (
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Shuffle className="w-6 h-6" />
                </motion.div>
                <span>Shuffling...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Shuffle className="w-6 h-6" />
                <span>Start Shuffle</span>
              </div>
            )}
          </motion.button>

          {/* Next Button */}
          <motion.button
            className="bg-white/20 backdrop-blur-sm p-4 rounded-full text-white hover:bg-white/30 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
            disabled={isShuffling}
          >
            <SkipForward className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Progress Bar */}
        {isShuffling && (
          <motion.div
            className="mt-6 w-80 bg-white/20 rounded-full h-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${shuffleProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Instructions */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="bg-black/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20"
              animate={{
                boxShadow: [
                  '0 0 30px rgba(255,255,255,0.2)',
                  '0 0 50px rgba(255,255,255,0.4)',
                  '0 0 30px rgba(255,255,255,0.2)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Shuffle?</h2>
              <p className="text-xl text-white/80 mb-6">
                Mix up the participants and horses before the draw!
              </p>
              <div className="space-y-2 text-white/60">
                <p>• Cards will animate and shuffle randomly</p>
                <p>• Press the shuffle button to begin</p>
                <p>• Use SPACE or click Next when ready</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Display */}
      <motion.div
        className="absolute top-8 right-8 bg-black/30 backdrop-blur-sm rounded-xl p-4 text-white"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold">{participants.length}</div>
          <div className="text-sm opacity-75">Participants</div>
        </div>
        <div className="text-center space-y-2 mt-4">
          <div className="text-2xl font-bold">{horses.filter(h => !h.is_scratched).length}</div>
          <div className="text-sm opacity-75">Horses</div>
        </div>
      </motion.div>

      {/* Mode indicator */}
      <motion.div
        className="absolute top-8 left-8 bg-purple-600/80 backdrop-blur-sm rounded-full px-6 py-3 text-white font-bold"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        animate={{
          boxShadow: [
            '0 0 20px rgba(147, 51, 234, 0.5)',
            '0 0 30px rgba(147, 51, 234, 0.8)',
            '0 0 20px rgba(147, 51, 234, 0.5)'
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        SHUFFLE MODE
      </motion.div>
    </div>
  )
}