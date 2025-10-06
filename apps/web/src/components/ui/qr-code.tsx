'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { QrCode, Download, Copy, ExternalLink, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

interface QRCodeShareProps {
  eventId: string
  eventName: string
  isActive?: boolean
  size?: 'sm' | 'md' | 'lg'
  showInline?: boolean
}

export function QRCodeShare({
  eventId,
  eventName,
  isActive = false,
  size = 'md',
  showInline = false
}: QRCodeShareProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Generate the public entry URL
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/e/${eventId}`
    : `https://melcup.app/e/${eventId}`

  const qrSize = size === 'sm' ? 120 : size === 'md' ? 200 : 300

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success('URL copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy URL:', err)
      toast.error('Failed to copy URL')
    }
  }

  const handleDownloadQR = () => {
    const svg = document.querySelector('#qr-canvas') as SVGElement
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      canvas.width = 200
      canvas.height = 200

      img.onload = () => {
        ctx?.drawImage(img, 0, 0)
        const link = document.createElement('a')
        link.download = `${eventName.replace(/[^a-zA-Z0-9]/g, '-')}-qr-code.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        toast.success('QR code downloaded!')
      }

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    }
  }

  const handleOpenUrl = () => {
    window.open(publicUrl, '_blank')
  }

  // Small inline QR code for event cards
  if (showInline && size === 'sm') {
    return (
      <div className="flex items-center space-x-2">
        <QRCodeSVG
          value={publicUrl}
          size={qrSize}
          level="H"
          includeMargin={true}
          className="border border-gray-200 rounded"
        />
        <div className="flex flex-col space-y-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyUrl}
            className="text-xs h-7 px-2"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy Link
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
              >
                <QrCode className="h-3 w-3 mr-1" />
                View Large
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <QRCodeDialog
                eventName={eventName}
                publicUrl={publicUrl}
                isActive={isActive}
                onCopyUrl={handleCopyUrl}
                onDownloadQR={handleDownloadQR}
                onOpenUrl={handleOpenUrl}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  // Full QR code dialog trigger button
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!isActive}
          className="flex items-center space-x-2"
        >
          <QrCode className="h-4 w-4" />
          <span>QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <QRCodeDialog
          eventName={eventName}
          publicUrl={publicUrl}
          isActive={isActive}
          onCopyUrl={handleCopyUrl}
          onDownloadQR={handleDownloadQR}
          onOpenUrl={handleOpenUrl}
        />
      </DialogContent>
    </Dialog>
  )
}

interface QRCodeDialogProps {
  eventName: string
  publicUrl: string
  isActive: boolean
  onCopyUrl: () => void
  onDownloadQR: () => void
  onOpenUrl: () => void
}

function QRCodeDialog({
  eventName,
  publicUrl,
  isActive,
  onCopyUrl,
  onDownloadQR,
  onOpenUrl
}: QRCodeDialogProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <span>Share Event</span>
        </DialogTitle>
        <DialogDescription>
          Patrons can scan this QR code to join "{eventName}"
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center space-y-4">
        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
          <QRCodeSVG
            id="qr-canvas"
            value={publicUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Status Badge */}
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "✓ Active - Ready for signups" : "⏳ Not active yet"}
        </Badge>

        {/* URL Display */}
        <div className="w-full bg-gray-50 p-3 rounded text-center">
          <p className="text-sm text-gray-600 mb-1">Public URL:</p>
          <p className="text-xs font-mono text-gray-800 break-all">{publicUrl}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full space-y-2">
          <div className="flex space-x-2">
            <Button
              onClick={onCopyUrl}
              variant="outline"
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button
              onClick={onDownloadQR}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR
            </Button>
          </div>

          <Button
            onClick={onOpenUrl}
            variant="secondary"
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Test Link
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-3 rounded-lg w-full">
          <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Print the QR code and display it at your venue</li>
            <li>• Patrons scan with their phone camera</li>
            <li>• They'll be taken directly to the signup form</li>
            <li>• No app installation required!</li>
          </ul>
        </div>
      </div>
    </>
  )
}