'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LobbyMode } from './lobby-mode'
import { ShuffleMode } from './shuffle-mode'
import { DrawMode } from './draw-mode'
import { WinnerMode } from './winner-mode'
import { ConfettiCanvas } from './confetti-canvas'
import { useRealtimeEvent } from '@/hooks/use-realtime-event'
import { motion, AnimatePresence } from 'framer-motion'
import { BrandingProvider, useBranding } from '@/contexts/branding-context'

export type TVMode = 'lobby' | 'shuffle' | 'draw' | 'winner'

interface TVDisplayProps {
  event: any
}

function TVDisplayContent({ event }: TVDisplayProps) {
  const [mode, setMode] = useState<TVMode>('lobby')
  const [horses, setHorses] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [currentDrawIndex, setCurrentDrawIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(false)
  const supabase = createClient()
  const { brandKit } = useBranding()

  // Realtime hooks for comprehensive updates
  const {
    participants,
    assignments,
    event: realtimeEvent,
    eventStats,
    loading,
    realtimeState
  } = useRealtimeEvent(event.id, {
    includeParticipants: true,
    includeAssignments: true,
    includeEventStatus: true,
    includeStats: true,
    includeAssignmentRelations: true,
    onParticipantAdded: () => {
      // Trigger subtle confetti for new participants
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
    },
    onAssignmentAdded: () => {
      // Trigger confetti for new assignments
      if (mode === 'draw' || mode === 'lobby') {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }
    },
    onStatusChange: (event, oldStatus) => {
      // Auto switch modes based on event status
      if (event.status === 'drawing' && mode === 'lobby') {
        setMode('shuffle')
      } else if (event.status === 'complete' && mode !== 'winner') {
        setMode('winner')
        setShowConfetti(true)
      }
    }
  })

  // Load horses and winners (not included in realtime hooks)
  useEffect(() => {
    async function loadStaticData() {
      try {
        // Load horses
        const { data: horseData } = await supabase
          .from('event_horses')
          .select('*')
          .eq('event_id', event.id)
          .order('number', { ascending: true })

        if (horseData) {
          setHorses(horseData)
        }

        // Load winners
        const { data: winnerData } = await supabase
          .from('winners')
          .select(`
            *,
            assignments!assignment_id(
              *,
              event_horses!event_horse_id(*),
              patron_entries!patron_entry_id(*)
            )
          `)
          .eq('event_id', event.id)
          .order('position', { ascending: true })

        if (winnerData) {
          setWinners(winnerData)
          if (winnerData.length > 0 && mode !== 'winner') {
            setMode('winner')
            setShowConfetti(true)
          }
        }
      } catch (error) {
        console.error('Error loading TV display static data:', error)
      }
    }

    loadStaticData()

    // Set up subscription for winners (not handled by realtime hook)
    const winnerChannel = supabase
      .channel(`tv_winners_${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'winners',
          filter: `event_id=eq.${event.id}`
        },
        () => {
          loadStaticData()
        }
      )
      .subscribe()

    return () => {
      winnerChannel.unsubscribe()
    }
  }, [event.id, mode, supabase])

  // Keyboard controls
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'Space':
        event.preventDefault()
        if (mode === 'lobby') {
          setMode('shuffle')
        } else if (mode === 'shuffle') {
          setMode('draw')
        } else if (mode === 'draw' && currentDrawIndex < assignments.length - 1) {
          setCurrentDrawIndex(prev => prev + 1)
        } else if (mode === 'draw' && winners.length > 0) {
          setMode('winner')
        }
        break
      case 'Escape':
        event.preventDefault()
        if (isFullscreen) {
          document.exitFullscreen()
        } else if (mode !== 'lobby') {
          setMode('lobby')
          setCurrentDrawIndex(0)
        }
        break
      case 'KeyF':
        event.preventDefault()
        if (!isFullscreen) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
        break
      case 'KeyM':
        event.preventDefault()
        setMusicEnabled(prev => !prev)
        break
      case 'KeyS':
        event.preventDefault()
        if (mode !== 'shuffle') {
          setMode('shuffle')
        }
        break
      case 'KeyD':
        event.preventDefault()
        if (assignments.length > 0 && mode !== 'draw') {
          setMode('draw')
        }
        break
      case 'KeyW':
        event.preventDefault()
        if (winners.length > 0 && mode !== 'winner') {
          setMode('winner')
        }
        break
      case 'KeyL':
        event.preventDefault()
        setMode('lobby')
        setCurrentDrawIndex(0)
        break
    }
  }, [mode, currentDrawIndex, assignments.length, winners.length, isFullscreen])

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  const modeProps = {
    event: realtimeEvent || event,
    participants,
    assignments,
    horses,
    winners,
    eventStats,
    realtimeState,
    currentDrawIndex,
    musicEnabled,
    onNext: () => {
      if (mode === 'lobby') {
        setMode('shuffle')
      } else if (mode === 'shuffle') {
        setMode('draw')
      } else if (mode === 'draw' && currentDrawIndex < assignments.length - 1) {
        setCurrentDrawIndex(prev => prev + 1)
      } else if (mode === 'draw' && winners.length > 0) {
        setMode('winner')
      }
    },
    onPrevious: () => {
      if (mode === 'draw' && currentDrawIndex > 0) {
        setCurrentDrawIndex(prev => prev - 1)
      } else if (mode === 'draw' && currentDrawIndex === 0) {
        setMode('shuffle')
      } else if (mode === 'shuffle') {
        setMode('lobby')
      } else if (mode === 'winner') {
        setMode('draw')
      }
    },
    onModeChange: setMode,
    onShowConfetti: () => {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }

  // Dynamic background based on branding
  const backgroundStyle = brandKit?.background_image_url
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), var(--brand-bg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {
        background: brandKit
          ? `linear-gradient(135deg, ${brandKit.color_primary}, ${brandKit.color_secondary})`
          : 'linear-gradient(135deg, #1e40af, #059669)'
      }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={backgroundStyle}
    >
      {/* Confetti Canvas */}
      <ConfettiCanvas show={showConfetti} />

      {/* Mode Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full h-full"
        >
          {mode === 'lobby' && <LobbyMode {...modeProps} />}
          {mode === 'shuffle' && <ShuffleMode {...modeProps} />}
          {mode === 'draw' && <DrawMode {...modeProps} />}
          {mode === 'winner' && <WinnerMode {...modeProps} />}
        </motion.div>
      </AnimatePresence>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 text-white/70 text-sm space-y-1 font-mono">
        <div>F - Fullscreen</div>
        <div>SPACE - Next</div>
        <div>ESC - Exit/Reset</div>
        <div>M - Music Toggle</div>
        <div>L - Lobby | S - Shuffle | D - Draw | W - Winner</div>
        <div className="mt-2 text-xs">Mode: {mode.toUpperCase()}</div>
        {mode === 'draw' && (
          <div className="text-xs">Draw: {currentDrawIndex + 1}/{assignments.length}</div>
        )}
      </div>

      {/* Music Indicator */}
      {musicEnabled && (
        <div className="absolute top-4 left-4 text-white/70 text-sm font-mono">
          ♪ Music: ON
        </div>
      )}

      {/* Realtime Status Indicator */}
      <div className="absolute top-4 left-4 opacity-70 hover:opacity-100 transition-opacity">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono ${
          realtimeState.isConnected
            ? 'bg-green-600/20 text-green-300 border border-green-500/30'
            : realtimeState.isReconnecting
            ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30'
            : 'bg-red-600/20 text-red-300 border border-red-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            realtimeState.isConnected
              ? 'bg-green-400'
              : realtimeState.isReconnecting
              ? 'bg-yellow-400 animate-pulse'
              : 'bg-red-400'
          }`} />
          <span>
            {realtimeState.isConnected ? 'LIVE' : realtimeState.isReconnecting ? 'RECONNECTING' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Fullscreen Indicator */}
      {isFullscreen && (
        <div className="absolute bottom-4 right-4 text-white/50 text-xs font-mono">
          FULLSCREEN MODE
        </div>
      )}
    </div>
  )
}

export function TVDisplay({ event }: TVDisplayProps) {
  // Extract tenant ID from event or determine based on your data structure
  const tenantId = event.tenant_id || event.venue_id || 'default'

  return (
    <BrandingProvider tenantId={tenantId}>
      <TVDisplayContent event={event} />
    </BrandingProvider>
  )
}