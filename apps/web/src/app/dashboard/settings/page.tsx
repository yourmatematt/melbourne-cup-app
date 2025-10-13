'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Upload, ChevronDown, Building, Palette } from 'lucide-react'
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading venue settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !venueSettings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="bg-white rounded-[20px] border border-gray-200/50 shadow-sm p-8 text-center max-w-md">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error || 'Venue settings not found'}</p>
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px]"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const canEdit = venueSettings.user_role === 'owner' || venueSettings.user_role === 'admin'

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {/* Venue Dropdown */}
          <div className="bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)] rounded-lg px-4 py-2.5 flex items-center gap-2 min-w-[180px]">
            <div className="w-6 h-6 bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">T</span>
            </div>
            <span className="text-sm text-gray-800 flex-1">The Royal Hotel</span>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-[32px] leading-[48px] font-normal text-slate-900 mb-1">Venue Settings</h1>
          <p className="text-[14px] leading-[20px] text-slate-600">Manage your venue configuration and branding</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-[20px] border border-gray-200/50 shadow-sm">
          <Tabs defaultValue="general" className="w-full">
            <div className="p-8 pb-0">
              <TabsList className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[16px] h-[46px] p-1 w-[200px]">
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-[#ff8a00] data-[state=active]:via-[#ff4d8d] data-[state=active]:to-[#8b5cf6] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-900 rounded-[10px] h-[36px] px-4 text-[16px]"
                >
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="branding"
                  className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-[#ff8a00] data-[state=active]:via-[#ff4d8d] data-[state=active]:to-[#8b5cf6] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-900 rounded-[10px] h-[36px] px-4 text-[16px]"
                >
                  Branding
                </TabsTrigger>
              </TabsList>
            </div>

            {/* GENERAL TAB */}
            <TabsContent value="general" className="p-8 pt-6">
              <div className="space-y-8">
                {/* Venue Information */}
                <div>
                  <h3 className="text-[18px] leading-[28px] font-normal text-slate-900 mb-5">Venue Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-[14px] text-slate-900 mb-3 block">Venue Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="The Crown Hotel"
                        className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[48px] px-3"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label className="text-[14px] text-slate-900 mb-3 block">Venue Slug</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => updateFormData('slug', e.target.value)}
                        placeholder="the-crown-hotel"
                        className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[48px] px-3"
                        disabled={!canEdit}
                      />
                      <p className="text-[12px] text-gray-500 mt-2">Used in URLs and system references</p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-[rgba(0,0,0,0.08)]" />

                {/* Account Information */}
                <div>
                  <h3 className="text-[18px] leading-[28px] font-normal text-slate-900 mb-5">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-[14px] text-slate-900 mb-3 block">Account Status</Label>
                      <div className="mt-1">
                        {getBillingStatusBadge(venueSettings.tenant.billing_status)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[14px] text-slate-900 mb-3 block">Your Role</Label>
                      <div className="mt-1">
                        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                          {venueSettings.user_role.charAt(0).toUpperCase() + venueSettings.user_role.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Actions */}
              {canEdit && (
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        loadVenueSettings()
                      }
                    }}
                    disabled={saving || !hasUnsavedChanges}
                    className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[36px] px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.name.trim()}
                    className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[36px] px-4"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* BRANDING TAB */}
            <TabsContent value="branding" className="p-8 pt-6">
              <div className="space-y-8">
                {/* Brand Assets */}
                <div>
                  <h3 className="text-[18px] leading-[28px] font-normal text-slate-900 mb-5">Brand Assets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Logo Upload */}
                    <div>
                      <Label className="text-[14px] text-slate-900 mb-3 block">Logo</Label>
                      <div className="bg-[rgba(0,0,0,0.02)] border-2 border-[rgba(0,0,0,0.1)] border-dashed rounded-[8px] h-[140px] flex items-center justify-center">
                        <div className="text-center">
                          <div className="bg-[rgba(248,247,244,0.5)] rounded-full w-6 h-6 flex items-center justify-center mx-auto mb-2">
                            <Upload className="w-4 h-4 text-slate-600" />
                          </div>
                          <p className="text-[14px] text-slate-900 mb-1">Click to upload or drag & drop</p>
                          <p className="text-[12px] text-gray-500 mb-4">PNG, JPG, SVG (recommended: 200x200px)</p>
                          <Button className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] text-slate-900 rounded-[8px] h-[42px] px-6 hover:bg-[#f8f7f4] hover:border-2 hover:border-orange-500 transition-all duration-200">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Logo
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Background Image Upload */}
                    <div>
                      <Label className="text-[14px] text-slate-900 mb-3 block">Background Image</Label>
                      <div className="bg-[rgba(0,0,0,0.02)] border-2 border-[rgba(0,0,0,0.1)] border-dashed rounded-[8px] h-[140px] flex items-center justify-center">
                        <div className="text-center">
                          <div className="bg-[rgba(248,247,244,0.5)] rounded-full w-6 h-6 flex items-center justify-center mx-auto mb-2">
                            <Upload className="w-4 h-4 text-slate-600" />
                          </div>
                          <p className="text-[14px] text-slate-900 mb-1">Click to upload or drag & drop</p>
                          <p className="text-[12px] text-gray-500 mb-4">JPG, PNG (recommended: 1920x1080px)</p>
                          <Button className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] text-slate-900 rounded-[8px] h-[42px] px-6 hover:bg-[#f8f7f4] hover:border-2 hover:border-orange-500 transition-all duration-200">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Background
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-[rgba(0,0,0,0.08)]" />

                {/* Brand Colours */}
                <div>
                  <h3 className="text-[18px] leading-[28px] font-normal text-slate-900 mb-5">Brand Colours</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Primary Color */}
                    <div>
                      <Label className="text-[14px] text-slate-900 mb-3 block">Primary Color</Label>
                      <div className="flex gap-3">
                        <div
                          className="w-12 h-12 rounded-[8px] border border-[rgba(0,0,0,0.08)]"
                          style={{ backgroundColor: formData.color_primary }}
                        />
                        <Input
                          value={formData.color_primary}
                          onChange={(e) => updateFormData('color_primary', e.target.value)}
                          placeholder="#1F2937"
                          className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[48px] px-3 w-[120px] font-mono text-[14px]"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    {/* Secondary Color */}
                    <div>
                      <Label className="text-[14px] text-slate-900 mb-3 block">Secondary Color</Label>
                      <div className="flex gap-3">
                        <div
                          className="w-12 h-12 rounded-[8px] border border-[rgba(0,0,0,0.08)]"
                          style={{ backgroundColor: formData.color_secondary }}
                        />
                        <Input
                          value={formData.color_secondary}
                          onChange={(e) => updateFormData('color_secondary', e.target.value)}
                          placeholder="#6B7280"
                          className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[8px] h-[48px] px-3 w-[120px] font-mono text-[14px]"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-400 mt-4">Used for printable QR displays and results posters</p>
                </div>
              </div>

              {/* Save Actions */}
              {canEdit && (
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        loadVenueSettings()
                      }
                    }}
                    disabled={saving || !hasUnsavedChanges}
                    className="bg-[#f8f7f4] border border-[rgba(0,0,0,0.08)] rounded-[12px] h-[36px] px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.name.trim()}
                    className="bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] text-white rounded-[12px] h-[36px] px-4"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}