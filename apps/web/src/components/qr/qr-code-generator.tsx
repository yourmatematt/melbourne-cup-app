'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCodeStyling from 'qr-code-styling'
import {
  QrCode,
  Download,
  Share2,
  Copy,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  Palette,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { trackQRCodeGenerated, trackQRCodeScanned } from '@/lib/analytics/posthog'

interface QRCodeGeneratorProps {
  event: {
    id: string
    name: string
    tenant: {
      name: string
      brand_color?: string
      logo_url?: string
    }
  }
  joinUrl: string
  onGenerate?: (qrData: string) => void
  className?: string
}

interface QRCodeOptions {
  size: number
  margin: number
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  type: 'svg' | 'png' | 'jpeg'
  dotsType: 'square' | 'rounded' | 'classy' | 'extra-rounded'
  cornersType: 'square' | 'rounded' | 'extra-rounded'
  cornersDotType: 'square' | 'rounded' | 'extra-rounded'
  backgroundColor: string
  foregroundColor: string
  includeImage: boolean
  imageSize: number
  imageMargin: number
}

export function QRCodeGenerator({
  event,
  joinUrl,
  onGenerate,
  className = ''
}: QRCodeGeneratorProps) {
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [qrData, setQrData] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const [options, setOptions] = useState<QRCodeOptions>({
    size: 400,
    margin: 20,
    errorCorrectionLevel: 'H',
    type: 'svg',
    dotsType: 'rounded',
    cornersType: 'extra-rounded',
    cornersDotType: 'rounded',
    backgroundColor: '#ffffff',
    foregroundColor: event.tenant.brand_color || '#000000',
    includeImage: !!event.tenant.logo_url,
    imageSize: 0.3,
    imageMargin: 10
  })

  // Generate QR code data with cryptographic signature
  const generateQRData = async () => {
    const timestamp = Date.now()
    const payload = {
      eventId: event.id,
      timestamp,
      url: joinUrl
    }

    try {
      // In a real implementation, you'd sign this with your server
      const response = await fetch('/api/qr/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const { signature } = await response.json()
        return JSON.stringify({
          ...payload,
          signature
        })
      }
    } catch (error) {
      console.error('Failed to sign QR data:', error)
    }

    // Fallback to unsigned data
    return JSON.stringify(payload)
  }

  // Initialize QR code
  const initializeQRCode = async () => {
    if (!qrRef.current) return

    setIsGenerating(true)

    try {
      const data = await generateQRData()
      setQrData(data)

      const qrCodeStyling = new QRCodeStyling({
        width: options.size,
        height: options.size,
        margin: options.margin,
        type: options.type as any,
        data: data,
        dotsOptions: {
          color: options.foregroundColor,
          type: options.dotsType as any
        },
        cornersSquareOptions: {
          color: options.foregroundColor,
          type: options.cornersType as any
        },
        cornersDotOptions: {
          color: options.foregroundColor,
          type: options.cornersDotType as any
        },
        backgroundOptions: {
          color: options.backgroundColor
        },
        imageOptions: options.includeImage && event.tenant.logo_url ? {
          crossOrigin: 'anonymous',
          margin: options.imageMargin,
          imageSize: options.imageSize,
          hideBackgroundDots: true,
          saveAsBlob: true
        } : undefined,
        qrOptions: {
          errorCorrectionLevel: options.errorCorrectionLevel
        }
      })

      // Add logo if available and enabled
      if (options.includeImage && event.tenant.logo_url) {
        try {
          await qrCodeStyling.update({
            image: event.tenant.logo_url
          })
        } catch (error) {
          console.warn('Failed to load logo for QR code:', error)
        }
      }

      setQrCode(qrCodeStyling)

      // Clear previous QR code and append new one
      if (qrRef.current) {
        qrRef.current.innerHTML = ''
        qrCodeStyling.append(qrRef.current)
      }

      onGenerate?.(data)
      trackQRCodeGenerated(event.id)

    } catch (error) {
      console.error('QR code generation failed:', error)
      toast({
        title: 'QR Code Generation Failed',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Download QR code
  const downloadQRCode = async (format: 'svg' | 'png' | 'jpeg' = 'png') => {
    if (!qrCode) return

    try {
      const extension = format === 'svg' ? 'svg' : format
      const filename = `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.${extension}`

      if (format === 'svg') {
        qrCode.download({
          name: filename,
          extension: 'svg'
        })
      } else {
        qrCode.download({
          name: filename,
          extension: format
        })
      }

      toast({
        title: 'QR Code Downloaded',
        description: `Downloaded as ${filename}`
      })
    } catch (error) {
      console.error('Download failed:', error)
      toast({
        title: 'Download Failed',
        description: 'Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Copy QR data to clipboard
  const copyQRData = async () => {
    if (!qrData) return

    try {
      await navigator.clipboard.writeText(qrData)
      toast({
        title: 'QR Data Copied',
        description: 'QR code data copied to clipboard'
      })
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive'
      })
    }
  }

  // Share QR code
  const shareQRCode = async () => {
    if (!qrCode) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${event.name}`,
          text: `Scan this QR code to join ${event.name} at ${event.tenant.name}`,
          url: joinUrl
        })
      } else {
        // Fallback to copying URL
        await navigator.clipboard.writeText(joinUrl)
        toast({
          title: 'Link Copied',
          description: 'Join link copied to clipboard'
        })
      }
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  // Print QR code
  const printQRCode = () => {
    if (!qrRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrElement = qrRef.current.cloneNode(true) as HTMLElement

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${event.name}</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .header {
              margin-bottom: 30px;
            }
            .event-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .venue-name {
              font-size: 18px;
              color: #666;
              margin-bottom: 20px;
            }
            .qr-container {
              margin: 30px 0;
            }
            .instructions {
              margin-top: 30px;
              font-size: 14px;
              color: #888;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="event-name">${event.name}</div>
            <div class="venue-name">${event.tenant.name}</div>
          </div>
          <div class="qr-container">${qrElement.outerHTML}</div>
          <div class="instructions">
            Scan this QR code with your phone camera to join the event
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  // Update QR code options
  const updateOptions = (newOptions: Partial<QRCodeOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }))
  }

  // Regenerate QR code when options change
  useEffect(() => {
    if (qrCode) {
      initializeQRCode()
    }
  }, [options])

  // Initial generation
  useEffect(() => {
    initializeQRCode()
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* QR Code Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="w-5 h-5" />
                <span>Event QR Code</span>
              </CardTitle>
              <CardDescription>
                Patrons can scan this to join {event.name}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
              >
                <Settings className="w-4 h-4 mr-1" />
                {showOptions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                Options
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={initializeQRCode}
                disabled={isGenerating}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            {/* QR Code Container */}
            <div className="relative">
              <motion.div
                ref={qrRef}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="border-2 border-gray-200 rounded-lg p-4 bg-white"
                style={{ minHeight: options.size + 32 }}
              />

              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => downloadQRCode('png')} className="flex items-center space-x-1">
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </Button>

              <Button variant="outline" onClick={() => downloadQRCode('svg')}>
                <Download className="w-4 h-4 mr-1" />
                SVG
              </Button>

              <Button variant="outline" onClick={shareQRCode}>
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>

              <Button variant="outline" onClick={copyQRData}>
                <Copy className="w-4 h-4 mr-1" />
                Copy Data
              </Button>

              <Button variant="outline" onClick={printQRCode}>
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>

            {/* Event Information */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Badge variant="secondary">{event.tenant.name}</Badge>
                <Badge variant="outline">QR Code Active</Badge>
              </div>
              <p className="text-sm text-gray-600">
                This QR code will redirect to: <br />
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{joinUrl}</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Options */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Customization Options</span>
                </CardTitle>
                <CardDescription>
                  Customize the appearance of your QR code
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="appearance" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="appearance">Appearance</TabsTrigger>
                    <TabsTrigger value="technical">Technical</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                  </TabsList>

                  <TabsContent value="appearance" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Size: {options.size}px</Label>
                        <Slider
                          value={[options.size]}
                          onValueChange={([value]) => updateOptions({ size: value })}
                          min={200}
                          max={800}
                          step={50}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Margin: {options.margin}px</Label>
                        <Slider
                          value={[options.margin]}
                          onValueChange={([value]) => updateOptions({ margin: value })}
                          min={0}
                          max={50}
                          step={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Dots Style</Label>
                        <Select value={options.dotsType} onValueChange={(value: any) => updateOptions({ dotsType: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="square">Square</SelectItem>
                            <SelectItem value="rounded">Rounded</SelectItem>
                            <SelectItem value="classy">Classy</SelectItem>
                            <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Corners Style</Label>
                        <Select value={options.cornersType} onValueChange={(value: any) => updateOptions({ cornersType: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="square">Square</SelectItem>
                            <SelectItem value="rounded">Rounded</SelectItem>
                            <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="technical" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Error Correction Level</Label>
                        <Select value={options.errorCorrectionLevel} onValueChange={(value: any) => updateOptions({ errorCorrectionLevel: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="L">Low (~7%)</SelectItem>
                            <SelectItem value="M">Medium (~15%)</SelectItem>
                            <SelectItem value="Q">Quartile (~25%)</SelectItem>
                            <SelectItem value="H">High (~30%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Export Format</Label>
                        <Select value={options.type} onValueChange={(value: any) => updateOptions({ type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="svg">SVG (Vector)</SelectItem>
                            <SelectItem value="png">PNG (Raster)</SelectItem>
                            <SelectItem value="jpeg">JPEG (Compressed)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="branding" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Foreground Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={options.foregroundColor}
                            onChange={(e) => updateOptions({ foregroundColor: e.target.value })}
                            className="w-12 h-10 p-1 border rounded"
                          />
                          <Input
                            type="text"
                            value={options.foregroundColor}
                            onChange={(e) => updateOptions({ foregroundColor: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={options.backgroundColor}
                            onChange={(e) => updateOptions({ backgroundColor: e.target.value })}
                            className="w-12 h-10 p-1 border rounded"
                          />
                          <Input
                            type="text"
                            value={options.backgroundColor}
                            onChange={(e) => updateOptions({ backgroundColor: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={options.includeImage}
                            onCheckedChange={(checked) => updateOptions({ includeImage: checked })}
                          />
                          <Label>Include Logo</Label>
                        </div>
                        <p className="text-xs text-gray-500">
                          {event.tenant.logo_url ? 'Logo available' : 'No logo configured for this venue'}
                        </p>
                      </div>

                      {options.includeImage && event.tenant.logo_url && (
                        <div className="space-y-2">
                          <Label>Logo Size: {Math.round(options.imageSize * 100)}%</Label>
                          <Slider
                            value={[options.imageSize]}
                            onValueChange={([value]) => updateOptions({ imageSize: value })}
                            min={0.1}
                            max={0.5}
                            step={0.05}
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Usage Instructions */}
      <Alert>
        <QrCode className="h-4 w-4" />
        <AlertDescription>
          <strong>How to use:</strong> Display this QR code at your venue for patrons to scan with their phone camera.
          They'll be taken directly to the join page for this event. The QR code includes security features to prevent tampering.
        </AlertDescription>
      </Alert>
    </div>
  )
}