'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BrandKit {
  id?: string
  tenant_id: string
  name: string
  color_primary: string
  color_secondary: string
  color_accent?: string
  logo_url?: string
  background_image_url?: string
  sponsor_banner_url?: string
  custom_css?: string
  is_active: boolean
}

interface BrandingContextType {
  brandKit: BrandKit | null
  loading: boolean
  error: string | null
  setBrandKit: (brandKit: BrandKit | null) => void
  refreshBrandKit: () => Promise<void>
  applyCSSProperties: (brandKit: BrandKit) => void
  removeCSSProperties: () => void
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

interface BrandingProviderProps {
  children: ReactNode
  tenantId?: string
  initialBrandKit?: BrandKit | null
}

export function BrandingProvider({ children, tenantId, initialBrandKit }: BrandingProviderProps) {
  const [brandKit, setBrandKitState] = useState<BrandKit | null>(initialBrandKit || null)
  const [loading, setLoading] = useState(!initialBrandKit)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // CSS custom properties to manage
  const brandProperties = [
    '--brand-primary',
    '--brand-secondary',
    '--brand-accent',
    '--brand-logo',
    '--brand-bg'
  ]

  const applyCSSProperties = (kit: BrandKit) => {
    const root = document.documentElement

    // Apply brand colors
    root.style.setProperty('--brand-primary', kit.color_primary)
    root.style.setProperty('--brand-secondary', kit.color_secondary)
    root.style.setProperty('--brand-accent', kit.color_accent || '#F97316')

    // Apply brand images
    if (kit.logo_url) {
      root.style.setProperty('--brand-logo', `url(${kit.logo_url})`)
    } else {
      root.style.removeProperty('--brand-logo')
    }

    if (kit.background_image_url) {
      root.style.setProperty('--brand-bg', `url(${kit.background_image_url})`)
    } else {
      root.style.removeProperty('--brand-bg')
    }

    // Apply custom CSS if provided
    if (kit.custom_css) {
      // Remove existing custom brand styles
      const existingStyle = document.getElementById('brand-custom-css')
      if (existingStyle) {
        existingStyle.remove()
      }

      // Add new custom CSS
      const style = document.createElement('style')
      style.id = 'brand-custom-css'
      style.textContent = kit.custom_css
      document.head.appendChild(style)
    }

    // Cache in localStorage for performance
    try {
      localStorage.setItem('brand-kit', JSON.stringify(kit))
      localStorage.setItem('brand-kit-timestamp', Date.now().toString())
    } catch (error) {
      console.warn('Failed to cache brand kit in localStorage:', error)
    }
  }

  const removeCSSProperties = () => {
    const root = document.documentElement

    brandProperties.forEach(property => {
      root.style.removeProperty(property)
    })

    // Remove custom CSS
    const existingStyle = document.getElementById('brand-custom-css')
    if (existingStyle) {
      existingStyle.remove()
    }

    // Clear localStorage cache
    try {
      localStorage.removeItem('brand-kit')
      localStorage.removeItem('brand-kit-timestamp')
    } catch (error) {
      console.warn('Failed to clear brand kit cache:', error)
    }
  }

  const setBrandKit = (kit: BrandKit | null) => {
    setBrandKitState(kit)

    if (kit) {
      applyCSSProperties(kit)
    } else {
      removeCSSProperties()
    }
  }

  const refreshBrandKit = async () => {
    if (!tenantId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No active brand kit found
          setBrandKit(null)
        } else {
          throw fetchError
        }
      } else {
        setBrandKit(data)
      }
    } catch (err) {
      console.error('Error fetching brand kit:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch brand kit')

      // Try to load from cache on error
      try {
        const cached = localStorage.getItem('brand-kit')
        const timestamp = localStorage.getItem('brand-kit-timestamp')

        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp)
          // Use cache if less than 1 hour old
          if (age < 3600000) {
            const cachedKit = JSON.parse(cached)
            setBrandKitState(cachedKit)
            applyCSSProperties(cachedKit)
          }
        }
      } catch (cacheError) {
        console.warn('Failed to load brand kit from cache:', cacheError)
      }
    } finally {
      setLoading(false)
    }
  }

  // Load brand kit on mount or tenant change
  useEffect(() => {
    if (!initialBrandKit && tenantId) {
      // Check cache first for instant loading
      try {
        const cached = localStorage.getItem('brand-kit')
        const timestamp = localStorage.getItem('brand-kit-timestamp')

        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp)
          // Use cache if less than 1 hour old
          if (age < 3600000) {
            const cachedKit = JSON.parse(cached)
            setBrandKitState(cachedKit)
            applyCSSProperties(cachedKit)
            setLoading(false)

            // Still refresh in background
            refreshBrandKit()
            return
          }
        }
      } catch (error) {
        console.warn('Failed to load brand kit from cache:', error)
      }

      refreshBrandKit()
    } else if (initialBrandKit) {
      setBrandKit(initialBrandKit)
    }
  }, [tenantId, initialBrandKit])

  // Set up realtime subscription for brand kit changes
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`brand_kit_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brand_kits',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          refreshBrandKit()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [tenantId])

  // Clean up CSS properties on unmount
  useEffect(() => {
    return () => {
      if (!brandKit) {
        removeCSSProperties()
      }
    }
  }, [])

  const contextValue: BrandingContextType = {
    brandKit,
    loading,
    error,
    setBrandKit,
    refreshBrandKit,
    applyCSSProperties,
    removeCSSProperties
  }

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider')
  }
  return context
}

// Hook for getting current brand CSS custom properties
export function useBrandCSS() {
  const { brandKit } = useBranding()

  if (!brandKit) {
    return {}
  }

  return {
    '--brand-primary': brandKit.color_primary,
    '--brand-secondary': brandKit.color_secondary,
    '--brand-accent': brandKit.color_accent || '#F97316',
    '--brand-logo': brandKit.logo_url ? `url(${brandKit.logo_url})` : 'none',
    '--brand-bg': brandKit.background_image_url ? `url(${brandKit.background_image_url})` : 'none'
  } as React.CSSProperties
}

// Utility for TailwindCSS arbitrary values
export function brandColor(property: 'primary' | 'secondary' | 'accent'): string {
  return `rgb(from var(--brand-${property}) r g b)`
}