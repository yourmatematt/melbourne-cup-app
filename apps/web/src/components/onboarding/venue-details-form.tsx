'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { venueDetailsSchema, type VenueDetailsData } from '@/lib/auth-schemas'
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
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { debounce } from 'lodash'

interface VenueDetailsFormProps {
  onSubmit: (data: VenueDetailsData) => void
  isLoading?: boolean
  defaultValues?: VenueDetailsData
  userVenueName?: string // Pre-filled from signup
}

export function VenueDetailsForm({ onSubmit, isLoading, defaultValues, userVenueName }: VenueDetailsFormProps) {
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const supabase = createClient()

  const form = useForm<VenueDetailsData>({
    resolver: zodResolver(venueDetailsSchema),
    defaultValues: defaultValues || {
      name: userVenueName || '',
      slug: ''
    }
  })

  const watchedName = form.watch('name')
  const watchedSlug = form.watch('slug')

  // Improved slug generation function
  const generateSlug = (venueName: string): string => {
    return venueName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .slice(0, 50) // Limit length
  }

  // Auto-generate slug from name with debounced updates
  useEffect(() => {
    if (watchedName && !form.formState.dirtyFields.slug) {
      const generatedSlug = generateSlug(watchedName)
      form.setValue('slug', generatedSlug, { shouldValidate: true })
    }
  }, [watchedName, form])

  // Debounced slug availability check
  const checkSlugAvailability = debounce(async (slug: string) => {
    if (slug.length < 3) {
      setSlugAvailable(null)
      return
    }

    setCheckingSlug(true)
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .limit(1)

      if (error) {
        console.error('Slug check error:', error)
        setSlugAvailable(null)
      } else {
        setSlugAvailable(data.length === 0)
      }
    } catch (err) {
      console.error('Slug availability check failed:', err)
      setSlugAvailable(null)
    } finally {
      setCheckingSlug(false)
    }
  }, 500)

  // Check slug availability when slug changes
  useEffect(() => {
    if (watchedSlug && watchedSlug.length >= 3) {
      checkSlugAvailability(watchedSlug)
    } else {
      setSlugAvailable(null)
    }
  }, [watchedSlug, checkSlugAvailability])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Name {userVenueName && "(from signup)"}</FormLabel>
              <FormControl>
                <Input
                  placeholder="The Crown Hotel"
                  {...field}
                  className={userVenueName ? "bg-blue-50" : ""}
                />
              </FormControl>
              <FormDescription>
                {userVenueName
                  ? "This was entered during signup. You can edit it if needed."
                  : "The official name of your venue or business"
                }
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <FormControl>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    melcup.app/
                  </span>
                  <Input
                    className="rounded-l-none"
                    placeholder="crown-hotel"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription>
                This will be your venue's unique URL. Only lowercase letters, numbers, and hyphens allowed.
                {checkingSlug && (
                  <span className="text-blue-600 block">🔍 Checking availability...</span>
                )}
                {!checkingSlug && slugAvailable === true && (
                  <span className="text-green-600 block">✓ Available</span>
                )}
                {!checkingSlug && slugAvailable === false && (
                  <span className="text-red-600 block">✗ Already taken - try another</span>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading || checkingSlug || slugAvailable === false}
          >
            {isLoading ? 'Saving...' : 'Continue to Branding'}
          </Button>
        </div>
      </form>
    </Form>
  )
}