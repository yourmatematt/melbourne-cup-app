'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCalcuttaLiveUpdates, type CalcuttaLiveData } from '@/lib/hooks/useCalcuttaLiveUpdates'
import { Maximize2, Minimize2, RefreshCw, Wifi, WifiOff, Clock, Trophy, DollarSign, Users } from 'lucide-react'

export default function LiveCalcuttaDisplayPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const { data, loading, error, connectionStatus, refresh } = useCalcuttaLiveUpdates({
    eventId,
    enabled: true
  })

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Handle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else if (isFullscreen && document.exitFullscreen) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.warn('Fullscreen not supported or failed:', error)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPresentationMode(!isPresentationMode)
      } else if (e.key === 'r' || e.key === 'R') {
        refresh()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPresentationMode, refresh])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  const formatRaceTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (diff <= 0) {
      return 'Race Time!'
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m until race`
    }
    return `${minutes}m until race`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: CalcuttaLiveData['raceStatus']) => {
    switch (status) {
      case 'pre-draw':
        return 'text-amber-400'
      case 'drawing-complete':
        return 'text-blue-400'
      case 'pre-race':
        return 'text-orange-400'
      case 'racing':
        return 'text-red-400 animate-pulse'
      case 'completed':
        return 'text-green-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusText = (status: CalcuttaLiveData['raceStatus']) => {
    switch (status) {
      case 'pre-draw':
        return 'Auction Open'
      case 'drawing-complete':
        return 'All Horses Sold'
      case 'pre-race':
        return 'Pre-Race'
      case 'racing':
        return 'RACING!'
      case 'completed':
        return 'Race Complete'
      default:
        return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-16 w-16 text-yellow-400 animate-spin mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-2">Loading Calcutta Display</h2>
          <p className="text-green-200 text-xl">Connecting to live feed...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="h-16 w-16 text-red-300 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-red-200 text-xl mb-6">{error || 'Failed to load calcutta data'}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-lg font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { event, assignments, results, prizePool, raceStatus } = data

  // Calculate winner info
  const getWinnerInfo = (place: number) => {
    const result = results.find(r => r.place === place)
    if (!result) return null

    const assignment = assignments.find(a => a.horse_number === result.horse_number)
    return {
      ...result,
      owner: assignment?.patron_entries.participant_name,
      auction_price: assignment?.auction_price
    }
  }

  const winnerFirst = getWinnerInfo(1)
  const winnerSecond = getWinnerInfo(2)
  const winnerThird = getWinnerInfo(3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 text-white font-black antialiased"
         style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>

      {/* Controls Overlay - Hidden in presentation mode */}
      {!isPresentationMode && (
        <div className="fixed top-4 right-4 z-50 flex space-x-2">
          <button
            onClick={() => setIsPresentationMode(true)}
            className="px-4 py-2 bg-black/50 hover:bg-black/70 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Presentation Mode
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          <button
            onClick={refresh}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="fixed top-4 left-4 z-50">
        <div className="flex items-center space-x-2 px-3 py-2 bg-black/50 rounded-lg">
          {connectionStatus.isConnected ? (
            <Wifi className="h-4 w-4 text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
          <span className="text-sm font-medium">
            {connectionStatus.isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Main Display */}
      <div className="p-8 lg:p-16">
        {/* Header */}
        <div className="text-center mb-12">
          {event.tenants?.name && (
            <h1 className="text-2xl lg:text-4xl xl:text-5xl text-yellow-400 mb-4">{event.tenants.name}</h1>
          )}
          <h2 className="text-4xl lg:text-6xl xl:text-8xl text-white mb-6">{event.name}</h2>
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-yellow-400" />
              <span className="text-xl lg:text-2xl xl:text-3xl">{formatTime(currentTime)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`h-4 w-4 rounded-full ${raceStatus === 'racing' ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`} />
              <span className={`text-xl lg:text-2xl xl:text-3xl ${getStatusColor(raceStatus)}`}>
                {getStatusText(raceStatus)}
              </span>
            </div>
          </div>
          {event.starts_at && (
            <p className="text-lg lg:text-xl text-green-200 mt-4">
              {formatRaceTime(event.starts_at)}
            </p>
          )}
        </div>

        {/* Prize Pool */}
        <div className="bg-black/30 rounded-2xl p-8 mb-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Trophy className="h-12 w-12 text-yellow-400" />
              <h3 className="text-2xl lg:text-4xl xl:text-5xl text-yellow-400">Prize Pool</h3>
            </div>
            <div className="text-4xl lg:text-6xl xl:text-8xl text-white animate-pulse mb-6">
              {formatCurrency(prizePool.total)}
            </div>
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-lg lg:text-xl text-yellow-400 mb-2">1st Place</div>
                <div className="text-xl lg:text-2xl xl:text-3xl text-white">{formatCurrency(prizePool.firstPlace)}</div>
              </div>
              <div>
                <div className="text-lg lg:text-xl text-yellow-400 mb-2">2nd Place</div>
                <div className="text-xl lg:text-2xl xl:text-3xl text-white">{formatCurrency(prizePool.secondPlace)}</div>
              </div>
              <div>
                <div className="text-lg lg:text-xl text-yellow-400 mb-2">3rd Place</div>
                <div className="text-xl lg:text-2xl xl:text-3xl text-white">{formatCurrency(prizePool.thirdPlace)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Results (if race completed) */}
        {raceStatus === 'completed' && results.length > 0 && (
          <div className="bg-yellow-400/10 border-2 border-yellow-400 rounded-2xl p-8 mb-12">
            <h3 className="text-2xl lg:text-4xl xl:text-5xl text-yellow-400 text-center mb-8">🏆 OFFICIAL RESULTS 🏆</h3>
            <div className="space-y-6">
              {winnerFirst && (
                <div className="bg-yellow-400/20 rounded-xl p-6 text-center">
                  <div className="text-xl lg:text-2xl xl:text-3xl text-yellow-400 mb-2">🥇 WINNER - Horse #{winnerFirst.horse_number}</div>
                  <div className="text-2xl lg:text-4xl xl:text-5xl text-white">{winnerFirst.owner}</div>
                  <div className="text-lg lg:text-xl text-green-200 mt-2">Wins {formatCurrency(winnerFirst.prize_amount)}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                {winnerSecond && (
                  <div className="bg-gray-400/20 rounded-xl p-6 text-center">
                    <div className="text-lg lg:text-xl text-gray-400 mb-2">🥈 2nd - Horse #{winnerSecond.horse_number}</div>
                    <div className="text-xl lg:text-2xl xl:text-3xl text-white">{winnerSecond.owner}</div>
                    <div className="text-lg lg:text-xl text-green-200 mt-2">{formatCurrency(winnerSecond.prize_amount)}</div>
                  </div>
                )}
                {winnerThird && (
                  <div className="bg-orange-400/20 rounded-xl p-6 text-center">
                    <div className="text-lg lg:text-xl text-orange-400 mb-2">🥉 3rd - Horse #{winnerThird.horse_number}</div>
                    <div className="text-xl lg:text-2xl xl:text-3xl text-white">{winnerThird.owner}</div>
                    <div className="text-lg lg:text-xl text-green-200 mt-2">{formatCurrency(winnerThird.prize_amount)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Horse Ownership Grid */}
        {assignments.length > 0 && (
          <div>
            <h3 className="text-2xl lg:text-4xl xl:text-5xl text-yellow-400 text-center mb-8">Horse Ownership</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {assignments.map((assignment) => {
                const isWinner = results.some(r => r.horse_number === assignment.horse_number)
                const placement = results.find(r => r.horse_number === assignment.horse_number)?.place

                return (
                  <div
                    key={assignment.horse_number}
                    className={`
                      rounded-xl p-6 text-center transition-all duration-500
                      ${isWinner
                        ? placement === 1
                          ? 'bg-yellow-400/30 border-2 border-yellow-400 animate-pulse'
                          : 'bg-green-400/20 border-2 border-green-400'
                        : raceStatus === 'racing'
                          ? 'bg-blue-400/10 border border-blue-400/50'
                          : 'bg-white/10 border border-white/30'
                      }
                    `}
                  >
                    <div className={`
                      text-xl lg:text-2xl xl:text-3xl mb-3 font-black
                      ${isWinner && placement === 1 ? 'text-yellow-400' : 'text-white'}
                    `}>
                      Horse #{assignment.horse_number}
                      {placement && (
                        <span className="block text-sm">
                          {placement === 1 ? '🥇' : placement === 2 ? '🥈' : placement === 3 ? '🥉' : `${placement}th`}
                        </span>
                      )}
                    </div>
                    <div className="text-lg lg:text-xl text-white mb-2">
                      {assignment.patron_entries.participant_name}
                    </div>
                    {assignment.auction_price && (
                      <div className="text-lg lg:text-xl text-green-200">
                        {formatCurrency(assignment.auction_price)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {assignments.length === 0 && (
          <div className="text-center py-16">
            <Users className="h-24 w-24 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl lg:text-4xl xl:text-5xl text-gray-400 mb-4">Auction Starting Soon</h3>
            <p className="text-xl lg:text-2xl xl:text-3xl text-gray-300">Horses will appear here as they are sold</p>
          </div>
        )}
      </div>

      {/* Help Text - Only show if not in presentation mode */}
      {!isPresentationMode && (
        <div className="fixed bottom-4 left-4 text-sm text-white/70">
          <p>Press P for presentation mode • F11 for fullscreen • R to refresh</p>
        </div>
      )}
    </div>
  )
}