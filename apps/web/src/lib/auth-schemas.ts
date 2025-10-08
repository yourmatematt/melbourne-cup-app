import { z } from 'zod'

// Authentication schemas - Magic Link (passwordless)
export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  venueName: z.string().min(1, 'Venue name is required').max(100, 'Venue name too long'),
  acceptTerms: z.boolean().refine(val => val, 'You must accept the terms and conditions')
})

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

// Onboarding schemas
export const venueDetailsSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(100, 'Name too long'),
  contactName: z.string().min(2, 'Contact name must be at least 2 characters').max(100, 'Contact name too long'),
  slug: z.string()
    .min(3, 'URL slug must be at least 3 characters')
    .max(50, 'URL slug too long')
    .regex(/^[a-z0-9-]+$/, 'URL slug can only contain lowercase letters, numbers, and hyphens')
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'URL slug cannot start or end with a hyphen')
})

export const brandKitSchema = z.object({
  logoFile: z.instanceof(File).optional(),
  colorPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  colorSecondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  backgroundFile: z.instanceof(File).optional()
})

export const eventSetupSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Name too long'),
  startsAt: z.string().min(1, 'Start date and time is required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100, 'Maximum capacity is 100'),
  mode: z.enum(['sweep', 'calcutta'], {
    required_error: 'Please select an event mode'
  })
})

// Type exports
export type SignupFormData = z.infer<typeof signupSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type VenueDetailsData = z.infer<typeof venueDetailsSchema>
export type BrandKitData = z.infer<typeof brandKitSchema>
export type EventSetupData = z.infer<typeof eventSetupSchema>