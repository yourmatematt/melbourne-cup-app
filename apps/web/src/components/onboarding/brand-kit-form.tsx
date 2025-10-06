'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { brandKitSchema, type BrandKitData } from '@/lib/auth-schemas'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BrandKitFormProps {
  onSubmit: (data: BrandKitData) => void
  onBack: () => void
  isLoading?: boolean
  defaultValues?: BrandKitData
}

export function BrandKitForm({ onSubmit, onBack, isLoading, defaultValues }: BrandKitFormProps) {
  const form = useForm<BrandKitData>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: defaultValues || {
      colorPrimary: '#FFB800',
      colorSecondary: '#1F2937'
    }
  })

  const watchedPrimary = form.watch('colorPrimary')
  const watchedSecondary = form.watch('colorSecondary')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Brand Colors</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose colors that represent your venue. These will be used throughout your sweep pages.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="colorPrimary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1 border"
                        {...field}
                      />
                      <Input
                        type="text"
                        placeholder="#FFB800"
                        className="flex-1"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Main accent color
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colorSecondary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1 border"
                        {...field}
                      />
                      <Input
                        type="text"
                        placeholder="#1F2937"
                        className="flex-1"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Supporting color
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Color preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <Label className="text-sm font-medium mb-2 block">Preview</Label>
            <div className="flex items-center space-x-2">
              <div
                className="w-16 h-16 rounded border"
                style={{ backgroundColor: watchedPrimary }}
              />
              <div
                className="w-16 h-16 rounded border"
                style={{ backgroundColor: watchedSecondary }}
              />
              <div className="flex-1">
                <div
                  className="text-white px-4 py-2 rounded text-sm font-medium"
                  style={{ backgroundColor: watchedPrimary }}
                >
                  Primary Button
                </div>
                <div
                  className="text-white px-4 py-2 rounded text-sm mt-2"
                  style={{ backgroundColor: watchedSecondary }}
                >
                  Secondary Button
                </div>
              </div>
            </div>
          </div>

          {/* File uploads - simplified for now */}
          <div className="space-y-4">
            <div>
              <Label>Logo Upload (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    form.setValue('logoFile', file)
                  }
                }}
              />
              <p className="text-sm text-gray-600 mt-1">
                Upload your venue logo (PNG, JPG, SVG)
              </p>
            </div>

            <div>
              <Label>Background Image (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    form.setValue('backgroundFile', file)
                  }
                }}
              />
              <p className="text-sm text-gray-600 mt-1">
                Upload a background image for your sweep pages
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Continue to Event Setup'}
          </Button>
        </div>
      </form>
    </Form>
  )
}