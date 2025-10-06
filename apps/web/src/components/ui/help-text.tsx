'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface HelpTextProps {
  children: React.ReactNode
  title?: string
  variant?: 'info' | 'warning' | 'success' | 'error'
  className?: string
}

// Basic help text component
export function HelpText({ children, title, variant = 'info', className }: HelpTextProps) {
  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <X className="w-4 h-4 text-red-600" />
      default:
        return <Info className="w-4 h-4 text-blue-600" />
    }
  }

  const getBgColor = () => {
    switch (variant) {
      case 'warning':
        return 'bg-orange-50 border-orange-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className={cn('p-3 rounded-lg border', getBgColor(), className)}>
      <div className="flex items-start space-x-2">
        {getIcon()}
        <div className="flex-1">
          {title && <p className="font-medium text-sm mb-1">{title}</p>}
          <div className="text-sm text-gray-700">{children}</div>
        </div>
      </div>
    </div>
  )
}

// Inline help tooltip
export function InlineHelp({
  content,
  children,
  side = 'top',
  className
}: {
  content: string
  children?: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center text-gray-400 hover:text-gray-600 transition-colors',
              className
            )}
          >
            {children || <HelpCircle className="w-4 h-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Expandable help section
export function ExpandableHelp({
  title,
  children,
  defaultExpanded = false,
  variant = 'info',
  className
}: {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  variant?: 'info' | 'warning' | 'success'
  className?: string
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const getColors = () => {
    switch (variant) {
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          icon: 'text-orange-600'
        }
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: 'text-green-600'
        }
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600'
        }
    }
  }

  const colors = getColors()

  return (
    <div className={cn('border rounded-lg', colors.bg, colors.border, className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full p-3 flex items-center justify-between text-left',
          'hover:bg-opacity-80 transition-colors',
          colors.text
        )}
      >
        <div className="flex items-center space-x-2">
          <Info className={cn('w-4 h-4', colors.icon)} />
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn('px-3 pb-3 text-sm', colors.text)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Step-by-step guide
export function StepGuide({
  steps,
  title,
  className
}: {
  steps: Array<{
    title: string
    content: React.ReactNode
    optional?: boolean
  }>
  title?: string
  className?: string
}) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  {step.optional && (
                    <Badge variant="secondary" className="text-xs">
                      Optional
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">{step.content}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Contextual help for specific features
export function FeatureHelp({
  feature,
  children,
  className
}: {
  feature: 'qr-codes' | 'draw-process' | 'tv-display' | 'patron-join' | 'event-setup'
  children?: React.ReactNode
  className?: string
}) {
  const getFeatureInfo = () => {
    switch (feature) {
      case 'qr-codes':
        return {
          title: 'QR Code Generation',
          description: 'Generate secure QR codes for easy patron registration',
          tips: [
            'QR codes are cryptographically signed for security',
            'Codes expire after 24 hours by default',
            'Patrons can scan with any camera app',
            'Customize appearance to match your branding'
          ],
          learnMore: '/help/qr-codes'
        }
      case 'draw-process':
        return {
          title: 'Random Draw System',
          description: 'Fair and transparent random assignment of patrons to horses',
          tips: [
            'Uses cryptographically secure randomization',
            'Can resume if interrupted by network issues',
            'All draws are audited and logged',
            'Supports both sweep and Calcutta modes'
          ],
          learnMore: '/help/draw-process'
        }
      case 'tv-display':
        return {
          title: 'TV Display Mode',
          description: 'Full-screen display perfect for venue screens',
          tips: [
            'Updates in real-time as patrons join',
            'Shows draw progress and results',
            'Optimized for large screens and projectors',
            'No interaction required - runs automatically'
          ],
          learnMore: '/help/tv-display'
        }
      case 'patron-join':
        return {
          title: 'Patron Registration',
          description: 'Simple and fast registration process for your customers',
          tips: [
            'Mobile-optimized for easy completion',
            'Optional email and phone collection',
            'GDPR compliant with consent options',
            'Duplicate detection prevents multiple entries'
          ],
          learnMore: '/help/patron-join'
        }
      case 'event-setup':
        return {
          title: 'Event Configuration',
          description: 'Set up your Melbourne Cup event with all the options you need',
          tips: [
            'Choose between sweep and Calcutta modes',
            'Set capacity limits and entry fees',
            'Configure branding and colors',
            'Import official Melbourne Cup 2025 data'
          ],
          learnMore: '/help/event-setup'
        }
      default:
        return {
          title: 'Feature Help',
          description: 'Learn how to use this feature effectively',
          tips: [],
          learnMore: '/help'
        }
    }
  }

  const info = getFeatureInfo()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <span>{info.title}</span>
        </CardTitle>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {children && <div className="text-sm text-gray-700">{children}</div>}

          {info.tips.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Tips & Best Practices</h4>
              <ul className="space-y-1">
                {info.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="w-3 h-3 mr-1" />
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Field-specific help text
export function FieldHelp({
  label,
  description,
  example,
  required = false,
  className
}: {
  label: string
  description: string
  example?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center space-x-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {required && <span className="text-red-500 text-sm">*</span>}
      </div>
      <p className="text-xs text-gray-500">{description}</p>
      {example && (
        <p className="text-xs text-gray-400">
          <span className="font-medium">Example:</span> {example}
        </p>
      )}
    </div>
  )
}

// Interactive tutorial callout
export function TutorialCallout({
  title,
  description,
  action,
  onAction,
  onDismiss,
  className
}: {
  title: string
  description: string
  action?: string
  onAction?: () => void
  onDismiss?: () => void
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
              ?
            </div>
            <h3 className="font-medium text-sm text-blue-900">{title}</h3>
          </div>
          <p className="text-sm text-blue-800 mb-3">{description}</p>
          <div className="flex space-x-2">
            {action && onAction && (
              <Button size="sm" onClick={onAction} className="bg-blue-600 hover:bg-blue-700">
                {action}
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="outline" onClick={onDismiss}>
                Got it
              </Button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-blue-400 hover:text-blue-600 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// Application-specific help content
export const HELP_CONTENT = {
  eventCapacity: 'The maximum number of patrons who can join your event. Once reached, new visitors will see a spectator mode.',
  qrCodeGeneration: 'QR codes are automatically generated with security features. Patrons can scan them to join your event instantly.',
  drawProcess: 'Our random draw uses cryptographically secure algorithms to ensure fair assignment of patrons to horses.',
  tvDisplayMode: 'Perfect for large screens in your venue. Shows real-time updates without requiring any interaction.',
  patronPrivacy: 'We only collect essential information and comply with GDPR. Patrons can opt out of marketing communications.',
  eventModes: {
    sweep: 'Traditional sweep where patrons are randomly assigned horses. Winner takes all or split according to your prize structure.',
    calcutta: 'Auction-style event where patrons bid on horses. Higher engagement but requires more management.'
  },
  leadExport: 'Export patron data for follow-up marketing. Includes only consenting patrons and complies with privacy regulations.'
} as const