import { z } from 'zod'

// Common validation patterns
const phoneRegex = /^(\+61|0)[0-9]{9}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const joinCodeRegex = /^[A-Z0-9]{6}$/
const hexColorRegex = /^#[0-9A-F]{6}$/i

// Patron Entry Validation
export const patronJoinSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .regex(phoneRegex, 'Phone number must be a valid Australian number (e.g., 0400123456 or +61400123456)')
    .optional()
    .or(z.literal('')),

  marketingConsent: z.boolean().default(false)
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone number must be provided',
    path: ['email']
  }
)

// Event Creation/Update Validation
export const eventSchema = z.object({
  name: z
    .string()
    .min(3, 'Event name must be at least 3 characters')
    .max(100, 'Event name must be less than 100 characters'),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),

  capacity: z
    .number()
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(1000, 'Capacity cannot exceed 1000'),

  mode: z.enum(['sweep', 'calcutta'], {
    errorMap: () => ({ message: 'Mode must be either sweep or calcutta' })
  }),

  starts_at: z
    .string()
    .datetime('Invalid start date format')
    .refine(
      (date) => new Date(date) > new Date(),
      'Start date must be in the future'
    ),

  entry_fee: z
    .number()
    .min(0, 'Entry fee cannot be negative')
    .max(10000, 'Entry fee cannot exceed $10,000')
    .optional(),

  prize_pool: z
    .number()
    .min(0, 'Prize pool cannot be negative')
    .max(1000000, 'Prize pool cannot exceed $1,000,000')
    .optional(),

  lead_capture: z.boolean().default(true),

  status: z.enum(['lobby', 'drawing', 'complete', 'cancelled']).default('lobby')
})

// Horse Validation
export const horseSchema = z.object({
  number: z
    .number()
    .int('Horse number must be a whole number')
    .min(1, 'Horse number must be at least 1')
    .max(50, 'Horse number cannot exceed 50'),

  name: z
    .string()
    .min(2, 'Horse name must be at least 2 characters')
    .max(50, 'Horse name must be less than 50 characters'),

  jockey: z
    .string()
    .min(2, 'Jockey name must be at least 2 characters')
    .max(50, 'Jockey name must be less than 50 characters'),

  trainer: z
    .string()
    .min(2, 'Trainer name must be at least 2 characters')
    .max(50, 'Trainer name must be less than 50 characters')
    .optional(),

  owner: z
    .string()
    .max(100, 'Owner name must be less than 100 characters')
    .optional(),

  odds: z
    .string()
    .regex(/^\d+\/\d+$/, 'Odds must be in format like "5/1" or "10/3"')
    .optional(),

  weight: z
    .number()
    .min(50, 'Weight must be at least 50kg')
    .max(70, 'Weight cannot exceed 70kg')
    .optional(),

  barrier: z
    .number()
    .int('Barrier must be a whole number')
    .min(1, 'Barrier must be at least 1')
    .max(24, 'Barrier cannot exceed 24')
    .optional(),

  is_scratched: z.boolean().default(false),

  scratched_at: z
    .string()
    .datetime('Invalid scratch date format')
    .optional()
    .nullable(),

  scratch_reason: z
    .string()
    .max(200, 'Scratch reason must be less than 200 characters')
    .optional()
})

// Brand Kit Validation
export const brandKitSchema = z.object({
  name: z
    .string()
    .min(2, 'Brand kit name must be at least 2 characters')
    .max(50, 'Brand kit name must be less than 50 characters'),

  color_primary: z
    .string()
    .regex(hexColorRegex, 'Primary color must be a valid hex color (e.g., #FF0000)'),

  color_secondary: z
    .string()
    .regex(hexColorRegex, 'Secondary color must be a valid hex color (e.g., #00FF00)'),

  color_accent: z
    .string()
    .regex(hexColorRegex, 'Accent color must be a valid hex color (e.g., #0000FF)')
    .optional(),

  logo_url: z
    .string()
    .url('Logo URL must be a valid URL')
    .optional()
    .or(z.literal('')),

  background_image_url: z
    .string()
    .url('Background image URL must be a valid URL')
    .optional()
    .or(z.literal('')),

  sponsor_banner_url: z
    .string()
    .url('Sponsor banner URL must be a valid URL')
    .optional()
    .or(z.literal('')),

  custom_css: z
    .string()
    .max(5000, 'Custom CSS must be less than 5000 characters')
    .optional(),

  is_active: z.boolean().default(true)
})

// Draw Execution Validation
export const drawExecutionSchema = z.object({
  seed: z
    .string()
    .min(8, 'Seed must be at least 8 characters')
    .max(64, 'Seed must be less than 64 characters')
    .optional(),

  skipScratched: z.boolean().default(true),
  dryRun: z.boolean().default(false)
})

// Winner Declaration Validation
export const winnerSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  assignment_id: z.string().uuid('Invalid assignment ID'),
  position: z
    .number()
    .int('Position must be a whole number')
    .min(1, 'Position must be at least 1')
    .max(10, 'Position cannot exceed 10'),

  prize_amount: z
    .number()
    .min(0, 'Prize amount cannot be negative')
    .max(1000000, 'Prize amount cannot exceed $1,000,000')
    .optional(),

  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
})

// Analytics Export Validation
export const exportSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).default('csv'),
  include_assignments: z.boolean().default(true),
  include_deleted: z.boolean().default(false),
  date_range: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional()
})

// QR Code Validation
export const qrCodeSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  timestamp: z.number().min(0, 'Invalid timestamp'),
  signature: z.string().min(1, 'Missing signature')
}).refine(
  (data) => {
    // Validate QR code is not expired (24 hours)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    return (now - data.timestamp) < maxAge
  },
  {
    message: 'QR code has expired',
    path: ['timestamp']
  }
)

// Join Code Validation
export const joinCodeLookupSchema = z.object({
  joinCode: z
    .string()
    .regex(joinCodeRegex, 'Join code must be 6 characters (letters and numbers only)')
    .transform((code) => code.toUpperCase())
})

// Assignment Validation
export const assignmentSchema = z.object({
  patron_entry_id: z.string().uuid('Invalid patron entry ID'),
  event_horse_id: z.string().uuid('Invalid horse ID'),
  draw_order: z
    .number()
    .int('Draw order must be a whole number')
    .min(1, 'Draw order must be at least 1')
})

// Undo Draw Validation
export const undoDrawSchema = z.object({
  count: z
    .number()
    .int('Count must be a whole number')
    .min(1, 'Count must be at least 1')
    .optional(),

  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(200, 'Reason must be less than 200 characters')
    .optional()
})

// Pagination Validation
export const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .refine((n) => n >= 1, 'Page must be at least 1')
    .default('1'),

  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be between 1 and 100')
    .default('20'),

  sort: z
    .enum(['created_at', 'updated_at', 'name', 'display_name'])
    .default('created_at'),

  order: z.enum(['asc', 'desc']).default('desc')
})

// API Response Validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  meta: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    timestamp: z.string().datetime().optional()
  }).optional()
})

// Environment Variables Validation
export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key required'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('Invalid NextAuth URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
})

// Type exports for use throughout the app
export type PatronJoinFormData = z.infer<typeof patronJoinSchema>
export type EventFormData = z.infer<typeof eventSchema>
export type HorseFormData = z.infer<typeof horseSchema>
export type BrandKitFormData = z.infer<typeof brandKitSchema>
export type DrawExecutionData = z.infer<typeof drawExecutionSchema>
export type WinnerFormData = z.infer<typeof winnerSchema>
export type ExportOptions = z.infer<typeof exportSchema>
export type QRCodeData = z.infer<typeof qrCodeSchema>
export type JoinCodeLookup = z.infer<typeof joinCodeLookupSchema>
export type AssignmentData = z.infer<typeof assignmentSchema>
export type UndoDrawData = z.infer<typeof undoDrawSchema>
export type PaginationParams = z.infer<typeof paginationSchema>
export type ApiResponse<T = any> = z.infer<typeof apiResponseSchema> & { data?: T }

// Validation helper functions
export const validateInput = <T>(schema: z.ZodSchema<T>, input: unknown): {
  success: boolean
  data?: T
  errors?: string[]
} => {
  try {
    const data = schema.parse(input)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    return {
      success: false,
      errors: ['Validation failed']
    }
  }
}

export const safeValidate = <T>(schema: z.ZodSchema<T>, input: unknown): z.SafeParseReturnType<unknown, T> => {
  return schema.safeParse(input)
}