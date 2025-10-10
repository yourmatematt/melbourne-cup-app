'use client'

import { useState, useEffect } from 'react'

interface DebugBannerProps {
  eventId?: string
  componentError?: string | null
}

export function ClientDebugBanner({ eventId, componentError }: DebugBannerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div style={{
      background: '#ff0000',
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
      border: '3px solid #ffffff'
    }}>
      🚨 DEBUG MODE ACTIVE - LIVE VIEW COMPONENT IS RENDERING 🚨
      <div style={{ fontSize: '14px', marginTop: '5px' }}>
        Event ID: {eventId || 'MISSING'} | Component Status: MOUNTED
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
          ❌ ERROR: {componentError}
        </div>
      )}
    </div>
  )
}