'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Settings, Save, Building, Palette, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface VenueSettings {
  tenant: {
    id: string
    name: string
    slug: string
    billing_status: string
    created_at: string
    updated_at: string
  }
  brand_kit?: {
    id: string
    logo_url?: string
    color_primary?: string
    color_secondary?: string
    bg_image_url?: string
    created_at: string
    updated_at: string
  }
  user_role: string
}

interface FormData {
  name: string
  slug: string
  color_primary: string
  color_secondary: string
  logo_url: string
  bg_image_url: string
}

export default function VenueSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [venueSettings, setVenueSettings] = useState<VenueSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    color_primary: '#1F2937',
    color_secondary: '#6B7280',
    logo_url: '',
    bg_image_url: ''
  })

  useEffect(() => {
    loadVenueSettings()
  }, [])

  async function loadVenueSettings() {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        router.push('/login')
        return
      }

      // Get user's tenant and role
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select(`
          tenant_id,
          role,
          tenants!inner (
            id,
            name,
            slug,
            billing_status,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .single()

      if (tenantError) {
        throw new Error('No venue found for your account')
      }

      // Get brand kit if it exists
      const { data: brandKit, error: brandError } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('tenant_id', tenantUser.tenant_id)
        .single()

      // Brand kit might not exist yet, so we ignore the error

      const settings: VenueSettings = {
        tenant: tenantUser.tenants,
        brand_kit: brandKit || undefined,
        user_role: tenantUser.role
      }

      setVenueSettings(settings)

      // Populate form with current values
      setFormData({
        name: settings.tenant.name || '',
        slug: settings.tenant.slug || '',
        color_primary: settings.brand_kit?.color_primary || '#1F2937',
        color_secondary: settings.brand_kit?.color_secondary || '#6B7280',
        logo_url: settings.brand_kit?.logo_url || '',
        bg_image_url: settings.brand_kit?.bg_image_url || ''
      })

      setHasUnsavedChanges(false)

    } catch (err) {
      console.error('Error loading venue settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load venue settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!venueSettings || !formData.name.trim()) {
      toast.error('Venue name is required')
      return
    }

    if (venueSettings.user_role !== 'owner' && venueSettings.user_role !== 'admin') {
      toast.error('You do not have permission to edit venue settings')
      return
    }

    setSaving(true)
    try {
      // Update tenant information
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          name: formData.name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', venueSettings.tenant.id)

      if (tenantError) throw tenantError

      // Update or create brand kit
      const brandKitData = {
        tenant_id: venueSettings.tenant.id,
        color_primary: formData.color_primary,
        color_secondary: formData.color_secondary,
        logo_url: formData.logo_url.trim() || null,
        bg_image_url: formData.bg_image_url.trim() || null,
        updated_at: new Date().toISOString()
      }

      if (venueSettings.brand_kit) {
        // Update existing brand kit
        const { error: brandError } = await supabase
          .from('brand_kits')
          .update(brandKitData)
          .eq('id', venueSettings.brand_kit.id)

        if (brandError) throw brandError
      } else {
        // Create new brand kit
        const { error: brandError } = await supabase
          .from('brand_kits')
          .insert({
            ...brandKitData,
            created_at: new Date().toISOString()
          })

        if (brandError) throw brandError
      }

      toast.success('Venue settings saved successfully')
      setHasUnsavedChanges(false)
      await loadVenueSettings() // Refresh data

    } catch (err) {
      console.error('Error saving venue settings:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save venue settings')
    } finally {
      setSaving(false)
    }
  }

  function updateFormData(field: keyof FormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  function generateSlugFromName(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleNameChange(name: string) {
    updateFormData('name', name)
    // Auto-generate slug if it hasn't been manually modified
    if (!hasUnsavedChanges || formData.slug === generateSlugFromName(formData.name)) {
      updateFormData('slug', generateSlugFromName(name))
    }
  }

  function getBillingStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading venue settings...</p>
        </div>
      </div>
    )
  }

  if (error || !venueSettings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error || 'Venue settings not found'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canEdit = venueSettings.user_role === 'owner' || venueSettings.user_role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Venue Settings</h1>
                <p className="text-gray-600">{venueSettings.tenant.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Unsaved Changes
                </Badge>
              )}
              {getBillingStatusBadge(venueSettings.tenant.billing_status)}
              <Badge variant="outline">
                {venueSettings.user_role.charAt(0).toUpperCase() + venueSettings.user_role.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Branding</span>
            </TabsTrigger>
          </TabsList>

          {/* GENERAL TAB */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Venue Information</span>
                </CardTitle>
                <CardDescription>
                  Basic venue details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Venue Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="The Crown Hotel"
                      className="mt-1"
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Venue Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => updateFormData('slug', e.target.value)}
                      placeholder="the-crown-hotel"
                      className="mt-1"
                      disabled={!canEdit}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used in URLs and system references
                    </p>
                  </div>
                </div>

                {!canEdit && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-700">
                      You need owner or admin permissions to edit venue settings.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Account status and subscription details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Account Status</Label>
                    <div className="mt-1">
                      {getBillingStatusBadge(venueSettings.tenant.billing_status)}
                    </div>
                  </div>

                  <div>
                    <Label>Your Role</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {venueSettings.user_role.charAt(0).toUpperCase() + venueSettings.user_role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <Label className="text-gray-600">Created</Label>
                    <p className="mt-1">
                      {new Date(venueSettings.tenant.created_at).toLocaleDateString('en-AU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Last Updated</Label>
                    <p className="mt-1">
                      {new Date(venueSettings.tenant.updated_at).toLocaleDateString('en-AU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BRANDING TAB */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Brand Colors</span>
                </CardTitle>
                <CardDescription>
                  Customize your venue's brand colors for events and communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="color_primary">Primary Color</Label>
                    <div className="flex space-x-3 mt-1">
                      <Input
                        id="color_primary"
                        type="color"
                        value={formData.color_primary}
                        onChange={(e) => updateFormData('color_primary', e.target.value)}
                        className="w-16 h-10 p-1 rounded cursor-pointer"
                        disabled={!canEdit}
                      />
                      <Input
                        value={formData.color_primary}
                        onChange={(e) => updateFormData('color_primary', e.target.value)}
                        placeholder="#1F2937"
                        className="flex-1 font-mono"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="color_secondary">Secondary Color</Label>
                    <div className="flex space-x-3 mt-1">
                      <Input
                        id="color_secondary"
                        type="color"
                        value={formData.color_secondary}
                        onChange={(e) => updateFormData('color_secondary', e.target.value)}
                        className="w-16 h-10 p-1 rounded cursor-pointer"
                        disabled={!canEdit}
                      />
                      <Input
                        value={formData.color_secondary}
                        onChange={(e) => updateFormData('color_secondary', e.target.value)}
                        placeholder="#6B7280"
                        className="flex-1 font-mono"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <Label className="text-sm font-medium">Color Preview</Label>
                  <div className="flex space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: formData.color_primary }}
                      />
                      <span className="text-sm">Primary</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: formData.color_secondary }}
                      />
                      <span className="text-sm">Secondary</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Assets</CardTitle>
                <CardDescription>
                  Upload and manage your venue's logo and background images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => updateFormData('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="mt-1"
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Direct URL to your venue logo (recommended: PNG, 200x200px)
                  </p>
                </div>

                <div>
                  <Label htmlFor="bg_image_url">Background Image URL</Label>
                  <Input
                    id="bg_image_url"
                    value={formData.bg_image_url}
                    onChange={(e) => updateFormData('bg_image_url', e.target.value)}
                    placeholder="https://example.com/background.jpg"
                    className="mt-1"
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Background image for event pages (recommended: JPG, 1920x1080px)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    💡 Tip: Upload your images to a service like Cloudinary, AWS S3, or use your website's media library to get direct URLs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Actions Bar */}
          {canEdit && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-lg shadow-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">You have unsaved changes</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        loadVenueSettings() // Reset form
                      }
                    }}
                    disabled={saving || !hasUnsavedChanges}
                  >
                    {hasUnsavedChanges ? 'Discard Changes' : 'Cancel'}
                  </Button>

                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.name.trim()}
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  )
}