'use client'

import { useState } from 'react'
import { type HorseFormData } from '@/lib/event-schemas'
import { SAMPLE_MELBOURNE_CUP_FIELD, parseHorseCSV, generateHorseCSV } from '@/lib/melbourne-cup-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Upload,
  Download,
  Plus,
  Trash2,
  GripVertical,
  RotateCcw,
  Copy,
  FileText
} from 'lucide-react'

interface HorseListEditorProps {
  horses: HorseFormData[]
  onChange: (horses: HorseFormData[]) => void
}

export function HorseListEditor({ horses, onChange }: HorseListEditorProps) {
  const [bulkText, setBulkText] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const handleAddHorse = () => {
    const newNumber = Math.max(...horses.map(h => h.number), 0) + 1
    const newHorse: HorseFormData = {
      number: newNumber,
      name: `Horse ${newNumber}`,
      jockey: '',
      isScratched: false
    }
    onChange([...horses, newHorse])
  }

  const handleUpdateHorse = (index: number, updates: Partial<HorseFormData>) => {
    const updatedHorses = horses.map((horse, i) =>
      i === index ? { ...horse, ...updates } : horse
    )
    onChange(updatedHorses)
  }

  const handleDeleteHorse = (index: number) => {
    const updatedHorses = horses.filter((_, i) => i !== index)
    onChange(updatedHorses)
  }

  const handleMoveHorse = (fromIndex: number, toIndex: number) => {
    const updatedHorses = [...horses]
    const [movedHorse] = updatedHorses.splice(fromIndex, 1)
    updatedHorses.splice(toIndex, 0, movedHorse)

    // Update numbers to match new order
    const reNumberedHorses = updatedHorses.map((horse, index) => ({
      ...horse,
      number: index + 1
    }))

    onChange(reNumberedHorses)
  }

  const handlePasteBulkText = () => {
    if (!bulkText.trim()) return

    const lines = bulkText.trim().split('\n')
    const newHorses: HorseFormData[] = lines.map((line, index) => {
      const parts = line.split(/[,\t|]/).map(part => part.trim())
      const name = parts[0] || `Horse ${index + 1}`
      const jockey = parts[1] || ''

      return {
        number: index + 1,
        name,
        jockey,
        isScratched: false
      }
    }).filter(horse => horse.name && horse.name !== '')

    onChange(newHorses)
    setBulkText('')
  }

  const handleCSVImport = () => {
    if (!csvFile) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      try {
        const parsedHorses = parseHorseCSV(csv)
        const formattedHorses: HorseFormData[] = parsedHorses.map(horse => ({
          ...horse,
          jockey: horse.jockey || '',
          isScratched: false
        }))
        onChange(formattedHorses)
        setCsvFile(null)
      } catch (error) {
        console.error('Error parsing CSV:', error)
      }
    }
    reader.readAsText(csvFile)
  }

  const handleCSVExport = () => {
    const csv = generateHorseCSV(horses)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'melbourne-cup-horses.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleLoadSampleField = () => {
    const sampleHorses: HorseFormData[] = SAMPLE_MELBOURNE_CUP_FIELD.map(horse => ({
      ...horse,
      jockey: horse.jockey || '',
      isScratched: false
    }))
    onChange(sampleHorses)
  }

  const handleResetToTemplate = () => {
    const templateHorses: HorseFormData[] = Array.from({ length: 24 }, (_, index) => ({
      number: index + 1,
      name: `Horse ${index + 1}`,
      jockey: '',
      isScratched: false
    }))
    onChange(templateHorses)
  }

  const scratchedCount = horses.filter(h => h.isScratched).length
  const activeCount = horses.length - scratchedCount

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{horses.length} Total</Badge>
            <Badge variant="default">{activeCount} Active</Badge>
            {scratchedCount > 0 && (
              <Badge variant="destructive">{scratchedCount} Scratched</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCSVExport}
            disabled={horses.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddHorse}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Horse
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Horse List</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {horses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600 text-center">
                  No horses added yet. Use the templates or import options to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {horses.map((horse, index) => (
                <Card key={index} className={horse.isScratched ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        <div className="w-12 text-center">
                          <Badge variant="outline" className="text-xs">
                            #{horse.number}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">Horse Name</Label>
                          <Input
                            value={horse.name}
                            onChange={(e) => handleUpdateHorse(index, { name: e.target.value })}
                            placeholder="Horse name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Jockey</Label>
                          <Input
                            value={horse.jockey || ''}
                            onChange={(e) => handleUpdateHorse(index, { jockey: e.target.value })}
                            placeholder="Jockey name"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={horse.isScratched}
                            onCheckedChange={(checked) => handleUpdateHorse(index, { isScratched: checked })}
                          />
                          <Label className="text-xs">Scratched</Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteHorse(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Paste Horse List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Paste horse names and jockeys (one per line)</Label>
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Example:&#10;Vauban, W. Buick&#10;Buckaroo, J. McDonald&#10;Onesmoothoperator, C. Williams"
                    className="mt-2 min-h-[150px] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Format: Horse Name, Jockey Name (separated by comma, tab, or pipe)
                  </p>
                </div>
                <Button onClick={handlePasteBulkText} disabled={!bulkText.trim()}>
                  <Copy className="w-4 h-4 mr-2" />
                  Import from Text
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CSV Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Upload CSV file</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    CSV format: number,name,jockey
                  </p>
                </div>
                <Button onClick={handleCSVImport} disabled={!csvFile}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import from CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Melbourne Cup 2024 Field</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Load the actual 2024 Melbourne Cup field for testing or reference
                </p>
                <Button onClick={handleLoadSampleField} variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Load 2024 Field
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Empty Template</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Start with 24 empty horse slots for Melbourne Cup 2025
                </p>
                <Button onClick={handleResetToTemplate} variant="outline" className="w-full">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}