'use client'

import { useBranding } from '@/contexts/branding-context'
import { useMemo } from 'react'

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  primaryRgb: string
  secondaryRgb: string
  accentRgb: string
}

export function useBrandColors(): BrandColors {
  const { brandKit } = useBranding()

  return useMemo(() => {
    if (!brandKit) {
      // Default colors when no brand kit is available
      return {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#F97316',
        primaryRgb: '59 130 246',
        secondaryRgb: '30 64 175',
        accentRgb: '249 115 22'
      }
    }

    // Helper function to convert hex to RGB values
    const hexToRgb = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `${r} ${g} ${b}`
    }

    return {
      primary: brandKit.color_primary,
      secondary: brandKit.color_secondary,
      accent: brandKit.color_accent || '#F97316',
      primaryRgb: hexToRgb(brandKit.color_primary),
      secondaryRgb: hexToRgb(brandKit.color_secondary),
      accentRgb: hexToRgb(brandKit.color_accent || '#F97316')
    }
  }, [brandKit])
}

// Utility functions for common brand color operations
export function getBrandColorStyle(
  color: 'primary' | 'secondary' | 'accent',
  opacity?: number
): React.CSSProperties {
  const cssVar = `var(--brand-${color})`

  if (opacity !== undefined) {
    return {
      color: `color-mix(in srgb, ${cssVar} ${opacity * 100}%, transparent)`
    }
  }

  return {
    color: cssVar
  }
}

export function getBrandBackgroundStyle(
  color: 'primary' | 'secondary' | 'accent',
  opacity?: number
): React.CSSProperties {
  const cssVar = `var(--brand-${color})`

  if (opacity !== undefined) {
    return {
      backgroundColor: `color-mix(in srgb, ${cssVar} ${opacity * 100}%, transparent)`
    }
  }

  return {
    backgroundColor: cssVar
  }
}

export function getBrandBorderStyle(
  color: 'primary' | 'secondary' | 'accent',
  opacity?: number
): React.CSSProperties {
  const cssVar = `var(--brand-${color})`

  if (opacity !== undefined) {
    return {
      borderColor: `color-mix(in srgb, ${cssVar} ${opacity * 100}%, transparent)`
    }
  }

  return {
    borderColor: cssVar
  }
}

// TailwindCSS class generator for brand colors
export function getBrandTailwindClasses(brandColors: BrandColors) {
  return {
    // Text colors
    textPrimary: `text-[${brandColors.primary}]`,
    textSecondary: `text-[${brandColors.secondary}]`,
    textAccent: `text-[${brandColors.accent}]`,

    // Background colors
    bgPrimary: `bg-[${brandColors.primary}]`,
    bgSecondary: `bg-[${brandColors.secondary}]`,
    bgAccent: `bg-[${brandColors.accent}]`,

    // Border colors
    borderPrimary: `border-[${brandColors.primary}]`,
    borderSecondary: `border-[${brandColors.secondary}]`,
    borderAccent: `border-[${brandColors.accent}]`,

    // Hover states
    hoverBgPrimary: `hover:bg-[${brandColors.primary}]`,
    hoverBgSecondary: `hover:bg-[${brandColors.secondary}]`,
    hoverBgAccent: `hover:bg-[${brandColors.accent}]`,

    // With opacity (using RGB values)
    bgPrimaryOpacity: (opacity: number) => `bg-[rgb(${brandColors.primaryRgb}/${opacity})]`,
    bgSecondaryOpacity: (opacity: number) => `bg-[rgb(${brandColors.secondaryRgb}/${opacity})]`,
    bgAccentOpacity: (opacity: number) => `bg-[rgb(${brandColors.accentRgb}/${opacity})]`,

    // Ring colors
    ringPrimary: `ring-[${brandColors.primary}]`,
    ringSecondary: `ring-[${brandColors.secondary}]`,
    ringAccent: `ring-[${brandColors.accent}]`,

    // Focus states
    focusRingPrimary: `focus:ring-[${brandColors.primary}]`,
    focusRingSecondary: `focus:ring-[${brandColors.secondary}]`,
    focusRingAccent: `focus:ring-[${brandColors.accent}]`
  }
}