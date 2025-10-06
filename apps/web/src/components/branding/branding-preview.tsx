'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Smartphone,
  Monitor,
  Users,
  Trophy,
  Calendar,
  QrCode,
  Eye,
  Star
} from 'lucide-react'

interface BrandKit {
  name: string
  color_primary: string
  color_secondary: string
  color_accent?: string
  logo_url?: string
  background_image_url?: string
  sponsor_banner_url?: string
  custom_css?: string
}

interface BrandingPreviewProps {
  brandKit: BrandKit
  className?: string
}

export function BrandingPreview({ brandKit, className = "" }: BrandingPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'patron' | 'tv' | 'dashboard'>('patron')

  const customStyles = {
    '--brand-primary': brandKit.color_primary,
    '--brand-secondary': brandKit.color_secondary,
    '--brand-accent': brandKit.color_accent || '#F97316',
    '--brand-logo': brandKit.logo_url ? `url(${brandKit.logo_url})` : 'none',
    '--brand-bg': brandKit.background_image_url ? `url(${brandKit.background_image_url})` : 'none'
  } as React.CSSProperties

  const PatronPreview = () => (
    <div
      className="rounded-lg overflow-hidden shadow-lg"
      style={{
        background: brandKit.background_image_url
          ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${brandKit.background_image_url})`
          : `linear-gradient(135deg, ${brandKit.color_primary}15, ${brandKit.color_secondary}15)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          {brandKit.logo_url ? (
            <img
              src={brandKit.logo_url}
              alt="Venue Logo"
              className="h-16 mx-auto object-contain"
            />
          ) : (
            <div
              className="h-16 w-32 mx-auto rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: brandKit.color_primary }}
            >
              VENUE LOGO
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold" style={{ color: brandKit.color_secondary }}>
              Melbourne Cup 2024
            </h1>
            <p className="text-sm opacity-80" style={{ color: brandKit.color_secondary }}>
              Join the excitement at our venue!
            </p>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-600">Event Progress</span>
              <Badge
                className="text-white"
                style={{ backgroundColor: brandKit.color_primary }}
              >
                <Trophy className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold" style={{ color: brandKit.color_primary }}>
                  24
                </div>
                <div className="text-xs text-gray-500">Participants</div>
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color: brandKit.color_secondary }}>
                  18
                </div>
                <div className="text-xs text-gray-500">Assigned</div>
              </div>
            </div>

            <div className="mt-4">
              <div
                className="h-2 rounded-full"
                style={{ backgroundColor: `${brandKit.color_primary}20` }}
              >
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: brandKit.color_primary,
                    width: '75%'
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="text-center space-y-3">
          <Button
            className="w-full text-white font-semibold"
            style={{ backgroundColor: brandKit.color_primary }}
          >
            <Users className="w-4 h-4 mr-2" />
            Join the Sweep
          </Button>

          <div className="flex items-center justify-center space-x-2 text-sm opacity-75">
            <QrCode className="w-4 h-4" />
            <span style={{ color: brandKit.color_secondary }}>
              Scan QR code to join on mobile
            </span>
          </div>
        </div>

        {/* Sponsor Banner */}
        {brandKit.sponsor_banner_url && (
          <div className="text-center">
            <img
              src={brandKit.sponsor_banner_url}
              alt="Sponsor"
              className="h-12 mx-auto object-contain opacity-90"
            />
          </div>
        )}
      </div>
    </div>
  )

  const TVPreview = () => (
    <div
      className="rounded-lg overflow-hidden shadow-lg aspect-video"
      style={{
        background: `linear-gradient(135deg, ${brandKit.color_primary}, ${brandKit.color_secondary})`,
        backgroundImage: brandKit.background_image_url
          ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${brandKit.background_image_url})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="p-8 text-white h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            {brandKit.logo_url ? (
              <img
                src={brandKit.logo_url}
                alt="Venue Logo"
                className="h-12 object-contain filter brightness-0 invert"
              />
            ) : (
              <div className="text-lg font-bold">VENUE LOGO</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75">Status</div>
            <Badge className="bg-white/20 text-white border-white/30">
              LIVE
            </Badge>
          </div>
        </div>

        {/* Center Content */}
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Melbourne Cup 2024</h1>
            <p className="text-xl opacity-90">The Race That Stops a Nation</p>
          </div>

          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">24</div>
              <div className="text-sm opacity-75">Participants</div>
            </div>
            <div>
              <div className="text-3xl font-bold">18</div>
              <div className="text-sm opacity-75">Assigned</div>
            </div>
            <div>
              <div className="text-3xl font-bold">6</div>
              <div className="text-sm opacity-75">Remaining</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end">
          <div className="text-sm opacity-75">
            <Calendar className="w-4 h-4 inline mr-1" />
            Tuesday, 5 November 2024
          </div>
          {brandKit.sponsor_banner_url && (
            <img
              src={brandKit.sponsor_banner_url}
              alt="Sponsor"
              className="h-8 object-contain opacity-75"
            />
          )}
        </div>
      </div>
    </div>
  )

  const DashboardPreview = () => (
    <div className="rounded-lg overflow-hidden shadow-lg bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {brandKit.logo_url ? (
              <img
                src={brandKit.logo_url}
                alt="Venue Logo"
                className="h-8 object-contain"
              />
            ) : (
              <div
                className="h-8 w-16 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: brandKit.color_primary }}
              >
                LOGO
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">Host Dashboard</h2>
              <p className="text-xs text-gray-500">Melbourne Cup 2024</p>
            </div>
          </div>

          <Button
            size="sm"
            className="text-white"
            style={{ backgroundColor: brandKit.color_primary }}
          >
            <Eye className="w-4 h-4 mr-1" />
            View Event
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: brandKit.color_primary }}
                />
                <span className="text-sm font-medium">Participants</span>
              </div>
              <div className="text-lg font-bold mt-1">24</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: brandKit.color_accent || '#F97316' }}
                />
                <span className="text-sm font-medium">Assigned</span>
              </div>
              <div className="text-lg font-bold mt-1">18</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            className="w-full text-white"
            style={{ backgroundColor: brandKit.color_primary }}
          >
            Start Draw
          </Button>
          <Button
            variant="outline"
            className="w-full"
            style={{ borderColor: brandKit.color_secondary, color: brandKit.color_secondary }}
          >
            Export Results
          </Button>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h3>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">John Smith joined</span>
                <Badge variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  New
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="w-5 h-5" />
          <span>Live Preview</span>
        </CardTitle>
        <div>
          <Tabs value={previewMode} onValueChange={(value: any) => setPreviewMode(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="patron" className="flex items-center space-x-1">
                <Smartphone className="w-4 h-4" />
                <span>Patron</span>
              </TabsTrigger>
              <TabsTrigger value="tv" className="flex items-center space-x-1">
                <Monitor className="w-4 h-4" />
                <span>TV Display</span>
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>Dashboard</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <motion.div
          key={previewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={customStyles}
        >
          {/* Custom CSS Injection */}
          {brandKit.custom_css && (
            <style dangerouslySetInnerHTML={{ __html: brandKit.custom_css }} />
          )}

          {previewMode === 'patron' && <PatronPreview />}
          {previewMode === 'tv' && <TVPreview />}
          {previewMode === 'dashboard' && <DashboardPreview />}
        </motion.div>

        {/* Color Palette Display */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Color Palette</h4>
          <div className="flex space-x-3">
            <div className="text-center">
              <div
                className="w-8 h-8 rounded-lg border-2 border-gray-200 mx-auto"
                style={{ backgroundColor: brandKit.color_primary }}
              />
              <div className="text-xs text-gray-500 mt-1">Primary</div>
            </div>
            <div className="text-center">
              <div
                className="w-8 h-8 rounded-lg border-2 border-gray-200 mx-auto"
                style={{ backgroundColor: brandKit.color_secondary }}
              />
              <div className="text-xs text-gray-500 mt-1">Secondary</div>
            </div>
            {brandKit.color_accent && (
              <div className="text-center">
                <div
                  className="w-8 h-8 rounded-lg border-2 border-gray-200 mx-auto"
                  style={{ backgroundColor: brandKit.color_accent }}
                />
                <div className="text-xs text-gray-500 mt-1">Accent</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}