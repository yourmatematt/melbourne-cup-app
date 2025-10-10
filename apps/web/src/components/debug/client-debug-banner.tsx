'use client'

import { useState, useEffect } from 'react'

interface DebugBannerProps {
  eventId?: string
  componentError?: string | null
  debugLogs?: string[]
}

export function ClientDebugBanner({ eventId, componentError, debugLogs = [] }: DebugBannerProps) {
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date().toISOString())

    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div style={{
      background: 'linear-gradient(90deg, #ff0000, #ff6600)',
      color: 'white',
      padding: '15px 20px',
      fontSize: '18px',
      fontWeight: 'bold',
      textAlign: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(255, 0, 0, 0.3)',
      border: '3px solid #ffffff'
    }}>
      🚨 DEBUG MODE ACTIVE - LIVE VIEW COMPONENT IS RENDERING 🚨
      <div style={{ fontSize: '14px', marginTop: '5px' }}>
        Timestamp: {currentTime} | Event ID: {eventId || 'MISSING'}
      </div>
      {componentError && (
        <div style={{
          background: '#fff',
          color: '#ff0000',
          padding: '10px',
          margin: '10px 0',
          borderRadius: '5px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          ❌ COMPONENT ERROR: {componentError}
        </div>
      )}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        padding: '10px',
        margin: '10px 0',
        borderRadius: '5px',
        fontSize: '12px',
        maxHeight: '100px',
        overflow: 'auto'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>📝 RECENT DEBUG LOGS:</div>
        {debugLogs.length === 0 ? (
          <div>No logs yet...</div>
        ) : (
          debugLogs.map((log, index) => (
            <div key={index} style={{ marginBottom: '2px' }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}