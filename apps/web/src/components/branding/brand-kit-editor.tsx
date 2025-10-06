'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ColorPicker } from './color-picker'
import { ImageUploader } from './image-uploader'
import { BrandingPreview } from './branding-preview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Palette,
  Image as ImageIcon,
  Settings,
  Eye,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react'

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
  created_at?: string
  updated_at?: string
}

interface BrandKitEditorProps {
  tenantId: string
  brandKit?: BrandKit
  onSave?: (brandKit: BrandKit) => void
  previewMode?: boolean
}

const DEFAULT_BRAND_KIT: Omit<BrandKit, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  name: 'Default Brand Kit',
  color_primary: '#FFB800',
  color_secondary: '#1F2937',
  color_accent: '#F97316',
  logo_url: null,
  background_image_url: null,
  sponsor_banner_url: null,
  custom_css: '',
  is_active: true
}

export function BrandKitEditor({
  tenantId,
  brandKit,
  onSave,
  previewMode = false
}: BrandKitEditorProps) {
  const [formData, setFormData] = useState<BrandKit>({
    ...DEFAULT_BRAND_KIT,
    tenant_id: tenantId,
    ...brandKit
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('colors')
  const [showPreview, setShowPreview] = useState(previewMode)

  const supabase = createClient()

  // Reset form when brandKit prop changes
  useEffect(() => {
    if (brandKit) {
      setFormData({ ...DEFAULT_BRAND_KIT, tenant_id: tenantId, ...brandKit })
    }
  }, [brandKit, tenantId])

  const updateFormData = (field: keyof BrandKit, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors([])
    setIsSaved(false)
  }

  const validateForm = (): string[] => {
    const validationErrors: string[] = []

    if (!formData.name?.trim()) {
      validationErrors.push('Brand kit name is required')
    }

    if (!formData.color_primary?.match(/^#[0-9A-Fa-f]{6}$/)) {
      validationErrors.push('Primary color must be a valid hex color')
    }

    if (!formData.color_secondary?.match(/^#[0-9A-Fa-f]{6}$/)) {
      validationErrors.push('Secondary color must be a valid hex color')
    }

    if (formData.color_accent && !formData.color_accent.match(/^#[0-9A-Fa-f]{6}$/)) {
      validationErrors.push('Accent color must be a valid hex color')
    }

    return validationErrors
  }

  const handleSave = async () => {
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors([])

    try {
      let result

      if (formData.id) {
        // Update existing brand kit
        const { data, error } = await supabase
          .from('brand_kits')
          .update({
            name: formData.name,
            color_primary: formData.color_primary,
            color_secondary: formData.color_secondary,
            color_accent: formData.color_accent,
            logo_url: formData.logo_url,
            background_image_url: formData.background_image_url,
            sponsor_banner_url: formData.sponsor_banner_url,
            custom_css: formData.custom_css,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id)
          .eq('tenant_id', tenantId)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Create new brand kit
        const { data, error } = await supabase
          .from('brand_kits')
          .insert({
            tenant_id: tenantId,
            name: formData.name,
            color_primary: formData.color_primary,
            color_secondary: formData.color_secondary,
            color_accent: formData.color_accent,
            logo_url: formData.logo_url,
            background_image_url: formData.background_image_url,
            sponsor_banner_url: formData.sponsor_banner_url,
            custom_css: formData.custom_css,
            is_active: formData.is_active
          })
          .select()
          .single()

        if (error) throw error
        result = data
      }

      setFormData(result)
      setIsSaved(true)
      onSave?.(result)

      // Clear success state after 3 seconds
      setTimeout(() => setIsSaved(false), 3000)

    } catch (error) {
      console.error('Error saving brand kit:', error)
      setErrors([error instanceof Error ? error.message : 'Failed to save brand kit'])
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({ ...DEFAULT_BRAND_KIT, tenant_id: tenantId, ...brandKit })
    setErrors([])
    setIsSaved(false)
  }

  const isModified = JSON.stringify(formData) !== JSON.stringify({ ...DEFAULT_BRAND_KIT, tenant_id: tenantId, ...brandKit })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Palette className="w-6 h-6 text-blue-600" />
            <span>Brand Kit Editor</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Customize your venue's branding and visual identity
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
          </Button>

          {isModified && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={isLoading || !isModified}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSaved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {isLoading ? 'Saving...' : isSaved ? 'Saved!' : 'Save Changes'}
            </span>
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-lg p-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Please fix the following errors:</h3>
                <ul className="mt-1 list-disc list-inside text-sm text-red-700">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                General brand kit settings and metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Brand Kit Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="e.g., Summer 2024 Theme"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => updateFormData('is_active', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active" className="text-sm">
                  Set as active brand kit
                </Label>
              </div>

              {formData.id && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    ID: {formData.id.slice(0, 8)}...
                  </Badge>
                  {formData.is_active && (
                    <Badge className="bg-green-100 text-green-800">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabbed Editor */}
          <Card>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="colors" className="flex items-center space-x-2">
                      <Palette className="w-4 h-4" />
                      <span>Colors</span>
                    </TabsTrigger>
                    <TabsTrigger value="images" className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>Images</span>
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Advanced</span>
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <div className="p-6">
                  <TabsContent value="colors" className="space-y-6 mt-0">
                    <ColorPicker
                      label="Primary Color"
                      color={formData.color_primary}
                      onChange={(color) => updateFormData('color_primary', color)}
                      presets={[
                        '#FFB800', '#FF6B35', '#F7931E', '#C5282F', '#8E44AD',
                        '#3498DB', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6'
                      ]}
                    />

                    <ColorPicker
                      label="Secondary Color"
                      color={formData.color_secondary}
                      onChange={(color) => updateFormData('color_secondary', color)}
                      presets={[
                        '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
                        '#2D3748', '#4A5568', '#718096', '#A0AEC0', '#CBD5E0'
                      ]}
                    />

                    <ColorPicker
                      label="Accent Color (Optional)"
                      color={formData.color_accent || '#F97316'}
                      onChange={(color) => updateFormData('color_accent', color)}
                      presets={[
                        '#F97316', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6',
                        '#F59E0B', '#06B6D4', '#84CC16', '#EC4899', '#6366F1'
                      ]}
                    />

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Color Usage Guide</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.color_primary }} />
                          <span><strong>Primary:</strong> Main brand color, buttons, highlights</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.color_secondary }} />
                          <span><strong>Secondary:</strong> Text, headers, navigation</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.color_accent || '#F97316' }} />
                          <span><strong>Accent:</strong> Call-to-action elements, alerts</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="images" className="space-y-6 mt-0">
                    <ImageUploader
                      label="Venue Logo"
                      description="Upload your venue's logo. Recommended: 400x200px, PNG or SVG"
                      value={formData.logo_url || undefined}
                      onChange={(url) => updateFormData('logo_url', url)}
                      bucket="brand-assets"
                      path={`${tenantId}/logos`}
                      aspectRatio="2/1"
                      maxSize={2}
                    />

                    <Separator />

                    <ImageUploader
                      label="Background Image"
                      description="Optional background image for patron screens. Recommended: 1920x1080px"
                      value={formData.background_image_url || undefined}
                      onChange={(url) => updateFormData('background_image_url', url)}
                      bucket="brand-assets"
                      path={`${tenantId}/backgrounds`}
                      aspectRatio="16/9"
                      maxSize={5}
                    />

                    <Separator />

                    <ImageUploader
                      label="Sponsor Banner"
                      description="Optional sponsor banner. Recommended: 800x200px"
                      value={formData.sponsor_banner_url || undefined}
                      onChange={(url) => updateFormData('sponsor_banner_url', url)}
                      bucket="brand-assets"
                      path={`${tenantId}/sponsors`}
                      aspectRatio="4/1"
                      maxSize={2}
                    />
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-6 mt-0">
                    <div>
                      <Label htmlFor="custom_css">Custom CSS</Label>
                      <p className="text-sm text-gray-500 mb-2">
                        Add custom CSS rules for advanced styling. Use CSS custom properties like --brand-primary.
                      </p>
                      <Textarea
                        id="custom_css"
                        value={formData.custom_css || ''}
                        onChange={(e) => updateFormData('custom_css', e.target.value)}
                        placeholder="/* Custom CSS rules */
.custom-element {
  background: var(--brand-primary);
  color: var(--brand-secondary);
}"
                        rows={10}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Available CSS Variables</h4>
                      <div className="space-y-1 text-sm text-blue-800 font-mono">
                        <div>--brand-primary: {formData.color_primary}</div>
                        <div>--brand-secondary: {formData.color_secondary}</div>
                        <div>--brand-accent: {formData.color_accent || '#F97316'}</div>
                        <div>--brand-logo: url({formData.logo_url || 'none'})</div>
                        <div>--brand-bg: url({formData.background_image_url || 'none'})</div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <BrandingPreview brandKit={formData} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}