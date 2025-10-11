'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  animate?: boolean
  variant?: 'pulse' | 'wave' | 'shimmer'
}

// Base skeleton component
export function Skeleton({ className, animate = true, variant = 'pulse' }: SkeletonProps) {
  const baseClasses = "bg-gray-200 rounded"

  const animations = {
    pulse: {
      opacity: [1, 0.5, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    wave: {
      backgroundPosition: ["200% 0", "-200% 0"],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "linear"
      }
    },
    shimmer: {
      x: ["-100%", "100%"],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  if (!animate) {
    return <div className={cn(baseClasses, className)} />
  }

  if (variant === 'wave') {
    return (
      <div className={cn(baseClasses, className, "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]")}>
        <motion.div
          className="w-full h-full"
          animate={animations.wave}
        />
      </div>
    )
  }

  if (variant === 'shimmer') {
    return (
      <div className={cn(baseClasses, className, "relative overflow-hidden")}>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
          animate={animations.shimmer}
        />
      </div>
    )
  }

  return (
    <motion.div
      className={cn(baseClasses, className)}
      animate={animations.pulse}
    />
  )
}

// Specialized skeleton components
export function SkeletonText({ lines = 1, className, ...props }: { lines?: number } & SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full" // Last line is shorter
          )}
          {...props}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("p-6 border rounded-[20px]", className)}>
      <Skeleton className="h-6 w-1/3 mb-4" {...props} />
      <SkeletonText lines={3} {...props} />
      <div className="mt-4 flex space-x-2">
        <Skeleton className="h-8 w-20" {...props} />
        <Skeleton className="h-8 w-16" {...props} />
      </div>
    </div>
  )
}

export function SkeletonAvatar({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn("w-10 h-10 rounded-full", className)}
      {...props}
    />
  )
}

export function SkeletonButton({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn("h-10 w-24 rounded-xl", className)}
      {...props}
    />
  )
}

export function SkeletonTable({ rows = 5, columns = 4, className, ...props }: {
  rows?: number
  columns?: number
} & SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 w-full" {...props} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 w-full" {...props} />
          ))}
        </div>
      ))}
    </div>
  )
}

// Loading screen components
export function LoadingSpinner({ size = 'md', className }: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <motion.div
      className={cn(
        'border-2 border-gray-200 border-t-blue-600 rounded-full',
        sizeClasses[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  )
}

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-blue-600 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  )
}

export function LoadingPulse({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("w-4 h-4 bg-blue-600 rounded-full", className)}
      animate={{
        scale: [1, 1.5, 1],
        opacity: [1, 0.3, 1]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity
      }}
    />
  )
}

// Full page loading components
export function PageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  )
}

export function SectionLoading({ message = "Loading...", className }: {
  message?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="text-center">
        <LoadingSpinner className="mx-auto mb-2" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  )
}

// Specialized loading states for different app sections
export function EventListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border rounded-[20px] p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div>
              <Skeleton className="h-4 w-14 mb-1" />
              <Skeleton className="h-6 w-10" />
            </div>
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ParticipantListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border rounded">
          <SkeletonAvatar />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

export function AnalyticsCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border rounded-[20px] p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="w-full" style={{ height: `${height}px` }} />
    </div>
  )
}

export function TVDisplaySkeleton() {
  return (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-8"
        />
        <h1 className="text-4xl font-bold mb-4">Preparing TV Display</h1>
        <p className="text-xl text-white/80">Loading event data...</p>
        <div className="mt-8">
          <LoadingDots />
        </div>
      </div>
    </div>
  )
}

export function PatronJoinSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header skeleton */}
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-[20px] mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>

        {/* Event info card skeleton */}
        <SkeletonCard />

        {/* Join form skeleton */}
        <div className="border rounded-[20px] p-6">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-12 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-14 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}