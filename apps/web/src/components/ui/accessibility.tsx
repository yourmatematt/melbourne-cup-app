'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// Screen reader only text component
export function ScreenReaderOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      'sr-only absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
      className
    )}>
      {children}
    </span>
  )
}

// Skip link for keyboard navigation
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }: {
  href?: string
  children?: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-50 bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-all"
    >
      {children}
    </a>
  )
}

// High contrast mode detector
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => setIsHighContrast(e.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isHighContrast
}

// Reduced motion detector
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Focus trap for modals and dialogs
export function useFocusTrap(enabled: boolean = true) {
  const containerRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [enabled])

  return containerRef
}

// Announcement region for screen readers
export function AnnouncementRegion({
  children,
  priority = 'polite',
  className
}: {
  children: React.ReactNode
  priority?: 'polite' | 'assertive'
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  )
}

// Progress indicator with proper ARIA attributes
export function AccessibleProgress({
  value,
  max = 100,
  label,
  description,
  className
}: {
  value: number
  max?: number
  label: string
  description?: string
  className?: string
}) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        <label id="progress-label" className="text-sm font-medium">
          {label}
        </label>
        <span className="text-sm text-gray-600">{percentage}%</span>
      </div>

      <div
        role="progressbar"
        aria-labelledby="progress-label"
        aria-describedby={description ? "progress-description" : undefined}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="w-full bg-gray-200 rounded-full h-2"
      >
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && (
        <p id="progress-description" className="text-xs text-gray-500 mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

// Error message with proper ARIA attributes
export function AccessibleErrorMessage({
  children,
  fieldId,
  className
}: {
  children: React.ReactNode
  fieldId?: string
  className?: string
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      id={fieldId ? `${fieldId}-error` : undefined}
      className={cn('text-sm text-red-600 mt-1', className)}
    >
      {children}
    </div>
  )
}

// Tooltip with proper accessibility
export function AccessibleTooltip({
  children,
  content,
  id,
  className
}: {
  children: React.ReactElement
  content: string
  id?: string
  className?: string
}) {
  const [isVisible, setIsVisible] = React.useState(false)
  const tooltipId = id || React.useId()

  return (
    <div className="relative inline-block">
      {React.cloneElement(children, {
        'aria-describedby': isVisible ? tooltipId : undefined,
        onMouseEnter: () => setIsVisible(true),
        onMouseLeave: () => setIsVisible(false),
        onFocus: () => setIsVisible(true),
        onBlur: () => setIsVisible(false)
      })}

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg',
            'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
            'after:content-[""] after:absolute after:top-full after:left-1/2 after:transform after:-translate-x-1/2',
            'after:border-4 after:border-transparent after:border-t-gray-900',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// Button with loading state and accessibility
export function AccessibleButton({
  children,
  loading = false,
  loadingText = 'Loading...',
  disabled = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingText?: string
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading && (
        <span className="sr-only">{loadingText}</span>
      )}

      <span className={cn(loading && 'opacity-0')}>
        {children}
      </span>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      )}
    </button>
  )
}

// Tab navigation with proper ARIA attributes
export function AccessibleTabs({
  tabs,
  activeTab,
  onTabChange,
  className
}: {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <div role="tablist" className="flex border-b">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                const nextIndex = (index + 1) % tabs.length
                onTabChange(tabs[nextIndex].id)
              } else if (e.key === 'ArrowLeft') {
                const prevIndex = (index - 1 + tabs.length) % tabs.length
                onTabChange(tabs[prevIndex].id)
              }
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          className="mt-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}

// List with proper semantics
export function AccessibleList({
  items,
  ordered = false,
  className
}: {
  items: Array<{ id: string; content: React.ReactNode }>
  ordered?: boolean
  className?: string
}) {
  const ListComponent = ordered ? 'ol' : 'ul'

  return (
    <ListComponent className={className}>
      {items.map((item) => (
        <li key={item.id}>
          {item.content}
        </li>
      ))}
    </ListComponent>
  )
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  // This is a simplified version - in production you'd use a proper color contrast library
  const getLuminance = (color: string) => {
    // Convert hex to RGB and calculate luminance
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255

    const [rs, gs, bs] = [r, g, b].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    )

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)

  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5
}

export function meetsWCAGAAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7
}