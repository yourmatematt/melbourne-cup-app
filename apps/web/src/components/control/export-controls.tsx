'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Download,
  FileText,
  Trophy,
  Users,
  History,
  Printer,
  QrCode,
  Mail,
  Shield,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Share2
} from 'lucide-react'
import { toast } from 'sonner'

interface ExportControlsProps {
  eventId: string
  event: {
    id: string
    name: string
    status: string
    starts_at?: string
  }
  stats?: {
    participantCount: number
    assignmentCount: number
    hasResults: boolean
  }
}

interface ExportOptions {
  redacted: boolean
  format: 'csv' | 'xlsx'
  includeEmail: boolean
  includePhone: boolean
}

export default function ExportControls({ eventId, event, stats }: ExportControlsProps) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportType, setExportType] = useState<string>('')
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    redacted: false,
    format: 'csv',
    includeEmail: true,
    includePhone: true
  })

  async function handleExport(type: string, options?: ExportOptions) {
    setExporting(type)
    try {
      const params = new URLSearchParams({
        type,
        format: options?.format || 'csv',
        redacted: options?.redacted ? 'true' : 'false'
      })

      console.log(`🔄 Starting export: ${type}`)

      const response = await fetch(`/api/events/${eventId}/export?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `export-${type}-${Date.now()}.csv`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      console.log(`✅ Export completed: ${filename}`)
      toast.success(`${type.replace('-', ' ')} exported successfully`)

    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setExporting(null)
      setShowExportDialog(false)
    }
  }

  function handlePrint(type: string) {
    const printUrl = `/dashboard/events/${eventId}/print/${type}`
    window.open(printUrl, '_blank', 'width=800,height=600')
  }

  function getJoinUrl() {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin
      return `${baseUrl}/events/${eventId}/join`
    }
    return ''
  }

  function getResultsUrl() {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin
      return `${baseUrl}/events/${eventId}/results`
    }
    return ''
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard!`)
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const exportItems = [
    {
      type: 'participants',
      label: 'All Participants',
      description: 'Complete list with contact details',
      icon: Users,
      available: (stats?.participantCount || 0) > 0,
      badge: (stats?.participantCount || 0).toString()
    },
    {
      type: 'draw-results',
      label: 'Draw Results',
      description: 'Horse assignments from draw',
      icon: FileText,
      available: (stats?.assignmentCount || 0) > 0,
      badge: (stats?.assignmentCount || 0).toString()
    },
    {
      type: 'winners',
      label: 'Winners Only',
      description: 'Prize winners and amounts',
      icon: Trophy,
      available: stats?.hasResults || false,
      badge: (stats?.hasResults) ? 'Results Available' : 'Pending'
    },
    {
      type: 'audit-log',
      label: 'Audit Log',
      description: 'Complete event history',
      icon: History,
      available: true,
      badge: 'Always Available'
    }
  ]

  const printItems = [
    {
      type: 'participants',
      label: 'Participant List',
      description: 'Formatted participant listing',
      available: (stats?.participantCount || 0) > 0
    },
    {
      type: 'draw-results',
      label: 'Draw Results Sheet',
      description: 'Official draw results for display',
      available: (stats?.assignmentCount || 0) > 0
    },
    {
      type: 'winners',
      label: 'Winner Certificates',
      description: 'Professional winner certificates',
      available: stats?.hasResults || false
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Export & Reporting</span>
        </CardTitle>
        <CardDescription>
          Export participant data, print results, and generate reports
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Export Actions */}
        <div>
          <Label className="text-base font-medium">Quick Exports</Label>
          <p className="text-sm text-gray-500 mb-3">Download CSV files instantly</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exportItems.map(item => (
              <Button
                key={item.type}
                variant="outline"
                onClick={() => handleExport(item.type)}
                disabled={!item.available || exporting === item.type}
                className="justify-start h-auto p-3"
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="flex-shrink-0">
                    {exporting === item.type ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <item.icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  <Badge variant={item.available ? "secondary" : "outline"} className="text-xs">
                    {item.badge}
                  </Badge>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Advanced Export Options */}
        <div>
          <Label className="text-base font-medium">Advanced Export</Label>
          <p className="text-sm text-gray-500 mb-3">Customize export format and privacy settings</p>

          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Export with Options
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Export Options</DialogTitle>
                <DialogDescription>
                  Customize your export settings for privacy and compliance
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Export Type Selection */}
                <div>
                  <Label>Export Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {exportItems.map(item => (
                      <Button
                        key={item.type}
                        variant={exportType === item.type ? "default" : "outline"}
                        onClick={() => setExportType(item.type)}
                        disabled={!item.available}
                        className="justify-start"
                        size="sm"
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Privacy Options */}
                <div className="space-y-4">
                  <Label>Privacy & Compliance</Label>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="redacted">Redact Personal Data</Label>
                      <p className="text-xs text-gray-500">Hide emails and phone numbers for GDPR compliance</p>
                    </div>
                    <Switch
                      id="redacted"
                      checked={exportOptions.redacted}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, redacted: checked }))
                      }
                    />
                  </div>

                  {!exportOptions.redacted && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <p className="text-sm text-amber-700">
                          Exported data will include personal information. Ensure compliance with your privacy policy.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Format Options */}
                <div>
                  <Label>File Format</Label>
                  <div className="flex space-x-2 mt-2">
                    <Button
                      variant={exportOptions.format === 'csv' ? "default" : "outline"}
                      onClick={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
                      size="sm"
                    >
                      CSV
                    </Button>
                    <Button
                      variant={exportOptions.format === 'xlsx' ? "default" : "outline"}
                      onClick={() => setExportOptions(prev => ({ ...prev, format: 'xlsx' }))}
                      size="sm"
                      disabled
                    >
                      Excel (Coming Soon)
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleExport(exportType, exportOptions)}
                  disabled={!exportType || exporting !== null}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {/* Print Options */}
        <div>
          <Label className="text-base font-medium">Print & Display</Label>
          <p className="text-sm text-gray-500 mb-3">Generate printable reports and displays</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {printItems.map(item => (
              <Button
                key={item.type}
                variant="outline"
                onClick={() => handlePrint(item.type)}
                disabled={!item.available}
                className="justify-start h-auto p-3"
              >
                <div className="flex items-center space-x-3 w-full">
                  <Printer className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </div>
              </Button>
            ))}

            <Button
              variant="outline"
              onClick={() => handlePrint('qr-poster')}
              className="justify-start h-auto p-3"
            >
              <div className="flex items-center space-x-3 w-full">
                <QrCode className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">QR Code Poster</div>
                  <div className="text-xs text-gray-500">A4 poster for venue display</div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Share & URLs */}
        <div>
          <Label className="text-base font-medium">Share & URLs</Label>
          <p className="text-sm text-gray-500 mb-3">Direct links for participants and public access</p>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Label className="text-sm">Participant Join URL</Label>
                <p className="text-xs text-gray-500">Direct link for participants to join</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getJoinUrl(), 'Join URL')}
              >
                <Share2 className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={getJoinUrl()} target="_blank">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Label className="text-sm">Public Results URL</Label>
                <p className="text-xs text-gray-500">Public page to check results</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getResultsUrl(), 'Results URL')}
              >
                <Share2 className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={getResultsUrl()} target="_blank">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Bulk Actions */}
        <div>
          <Label className="text-base font-medium">Bulk Actions</Label>
          <p className="text-sm text-gray-500 mb-3">Automated reports and notifications</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" disabled className="justify-start">
              <Mail className="h-4 w-4 mr-2" />
              Email Reports
            </Button>

            <Button variant="outline" disabled className="justify-start">
              <Download className="h-4 w-4 mr-2" />
              Download All (ZIP)
            </Button>
          </div>

          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              📧 Email features and bulk downloads coming soon! Export individual files for now.
            </p>
          </div>
        </div>

        {/* Status Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Export Availability</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              {(stats?.participantCount || 0) > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Participants ({stats?.participantCount || 0})</span>
            </div>
            <div className="flex items-center space-x-2">
              {(stats?.assignmentCount || 0) > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Draw Results ({stats?.assignmentCount || 0})</span>
            </div>
            <div className="flex items-center space-x-2">
              {(stats?.hasResults) ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Winners ({(stats?.hasResults) ? 'Available' : 'Pending'})</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Audit Log (Always)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}