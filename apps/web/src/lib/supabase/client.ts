import { createBrowserClient } from '@supabase/ssr'

// Debug helper for authentication storage
export function debugAuthStorage() {
  if (typeof window === 'undefined') return { storage: 'server-side' }

  const storageKey = 'sb-auth-token'
  const item = window.localStorage.getItem(storageKey)

  console.log('🔐 Auth storage debug:', {
    storageKey,
    hasItem: !!item,
    itemLength: item?.length || 0,
    itemType: typeof item,
    itemStart: item ? item.substring(0, 50) + '...' : 'null',
    isJSON: item ? (item.startsWith('{') || item.startsWith('[')) : false,
    isBase64: item ? !item.startsWith('{') && !item.startsWith('[') : false
  })

  return {
    hasStorage: !!item,
    item,
    storageKey
  }
}

// Function to clear corrupted session data
export function clearCorruptedSession() {
  if (typeof window === 'undefined') return

  const storageKey = 'sb-auth-token'
  console.log('🧹 Clearing potentially corrupted session data')

  try {
    window.localStorage.removeItem(storageKey)
    // Also clear any other auth-related items
    const allKeys = Object.keys(window.localStorage)
    allKeys.forEach(key => {
      if (key.includes('sb-') || key.includes('supabase')) {
        window.localStorage.removeItem(key)
      }
    })
    console.log('✅ Session data cleared successfully')
  } catch (error) {
    console.error('❌ Error clearing session data:', error)
  }
}

// Custom storage implementation to ensure proper session serialization
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null

    try {
      const item = window.localStorage.getItem(key)
      if (!item) return null

      console.log(`🔐 Storage getItem "${key}":`, {
        hasItem: !!item,
        length: item.length,
        startsWithBrace: item.startsWith('{'),
        startsWithBracket: item.startsWith('['),
        preview: item.substring(0, 100) + '...'
      })

      // If it's already a valid JSON string, validate and return
      if (item.startsWith('{') || item.startsWith('[')) {
        try {
          // Validate JSON structure
          JSON.parse(item)
          return item
        } catch (parseError) {
          console.error(`🔐 Invalid JSON in storage for "${key}":`, parseError)
          // Clear corrupted data
          window.localStorage.removeItem(key)
          return null
        }
      }

      // If it's a base64 string, try to decode it
      try {
        const decoded = atob(item)
        console.log(`🔐 Decoded base64 for "${key}":`, {
          original: item.substring(0, 50) + '...',
          decoded: decoded.substring(0, 100) + '...',
          isJSON: decoded.startsWith('{') || decoded.startsWith('[')
        })

        // Validate decoded JSON
        if (decoded.startsWith('{') || decoded.startsWith('[')) {
          JSON.parse(decoded)
          return decoded
        }

        return decoded
      } catch (decodeError) {
        console.warn(`🔐 Failed to decode base64 for "${key}":`, decodeError)
        // Clear corrupted data
        window.localStorage.removeItem(key)
        return null
      }
    } catch (error) {
      console.error(`🔐 Error reading from localStorage for "${key}":`, error)
      return null
    }
  },

  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return

    try {
      console.log(`🔐 Storage setItem "${key}":`, {
        hasValue: !!value,
        length: value.length,
        isJSON: value.startsWith('{') || value.startsWith('['),
        preview: value.substring(0, 100) + '...'
      })

      // Validate that we're storing valid JSON for auth tokens
      if (key.includes('auth') && value && (value.startsWith('{') || value.startsWith('['))) {
        try {
          JSON.parse(value)
        } catch (parseError) {
          console.error(`🔐 Attempting to store invalid JSON for "${key}":`, parseError)
          return
        }
      }

      window.localStorage.setItem(key, value)
    } catch (error) {
      console.error(`🔐 Error writing to localStorage for "${key}":`, error)
    }
  },

  removeItem: (key: string) => {
    if (typeof window === 'undefined') return

    try {
      console.log(`🔐 Storage removeItem "${key}"`)
      window.localStorage.removeItem(key)
    } catch (error) {
      console.error(`🔐 Error removing from localStorage for "${key}":`, error)
    }
  }
}

export function createClient() {
  // createBrowserClient with proper storage configuration for password authentication
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: customStorage,
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  )
}