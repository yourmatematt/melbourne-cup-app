import { z } from 'zod'

// ===== ENUMS =====

export const BillingStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TRIAL: 'trial',
  CANCELLED: 'cancelled'
} as const

export const UserRole = {
  OWNER: 'owner',
  HOST: 'host'
} as const

export const EventMode = {
  SWEEP: 'sweep',
  CALCUTTA: 'calcutta'
} as const

export const EventStatus = {
  DRAFT: 'draft',
  LOBBY: 'lobby',
  DRAWING: 'drawing',
  COMPLETE: 'complete'
} as const

// Type exports for enums
export type BillingStatus = typeof BillingStatus[keyof typeof BillingStatus]
export type UserRole = typeof UserRole[keyof typeof UserRole]
export type EventMode = typeof EventMode[keyof typeof EventMode]
export type EventStatus = typeof EventStatus[keyof typeof EventStatus]

// ===== ZOD SCHEMAS =====

// Base schemas for validation
export const billingStatusSchema = z.enum(['active', 'suspended', 'trial', 'cancelled'])
export const userRoleSchema = z.enum(['owner', 'host'])
export const eventModeSchema = z.enum(['sweep', 'calcutta'])
export const eventStatusSchema = z.enum(['draft', 'lobby', 'drawing', 'complete'])

// UUID validation
export const uuidSchema = z.string().uuid()

// Email validation
export const emailSchema = z.string().email()

// Phone validation (flexible international format)
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')

// ===== TENANT SCHEMAS =====

export const tenantSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  billing_status: billingStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  billing_status: billingStatusSchema.optional()
})

export const updateTenantSchema = createTenantSchema.partial()

// ===== USER SCHEMAS =====

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const createUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().optional().nullable()
})

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: z.string().optional().nullable()
})

// ===== TENANT USERS SCHEMAS =====

export const tenantUserSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  user_id: uuidSchema,
  role: userRoleSchema,
  created_at: z.string().datetime()
})

export const createTenantUserSchema = z.object({
  tenant_id: uuidSchema,
  user_id: uuidSchema,
  role: userRoleSchema.optional()
})

export const updateTenantUserSchema = z.object({
  role: userRoleSchema
})

// ===== BRAND KIT SCHEMAS =====

export const brandKitSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  logo_url: z.string().url().nullable(),
  color_primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  color_secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  bg_image_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const createBrandKitSchema = z.object({
  tenant_id: uuidSchema,
  logo_url: z.string().url().optional().nullable(),
  color_primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
  color_secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
  bg_image_url: z.string().url().optional().nullable()
})

export const updateBrandKitSchema = createBrandKitSchema.omit({ tenant_id: true }).partial()

// ===== EVENT SCHEMAS =====

export const eventSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  name: z.string().min(1).max(255),
  starts_at: z.string().datetime(),
  timezone: z.string().min(1),
  mode: eventModeSchema,
  status: eventStatusSchema,
  capacity: z.number().int().positive().nullable(),
  lead_capture: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const createEventSchema = z.object({
  tenant_id: uuidSchema,
  name: z.string().min(1).max(255),
  starts_at: z.string().datetime(),
  timezone: z.string().min(1).optional(),
  mode: eventModeSchema.optional(),
  status: eventStatusSchema.optional(),
  capacity: z.number().int().positive().optional().nullable(),
  lead_capture: z.boolean().optional()
})

export const updateEventSchema = createEventSchema.omit({ tenant_id: true }).partial()

// ===== EVENT HORSE SCHEMAS =====

export const eventHorseSchema = z.object({
  id: uuidSchema,
  event_id: uuidSchema,
  number: z.number().int().positive(),
  name: z.string().min(1).max(255),
  jockey: z.string().max(255).nullable(),
  is_scratched: z.boolean(),
  position: z.number().int().positive().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const createEventHorseSchema = z.object({
  event_id: uuidSchema,
  number: z.number().int().positive(),
  name: z.string().min(1).max(255),
  jockey: z.string().max(255).optional().nullable(),
  is_scratched: z.boolean().optional(),
  position: z.number().int().positive().optional().nullable()
})

export const updateEventHorseSchema = createEventHorseSchema.omit({ event_id: true }).partial()

// ===== PATRON ENTRY SCHEMAS =====

export const patronEntrySchema = z.object({
  id: uuidSchema,
  event_id: uuidSchema,
  display_name: z.string().min(1).max(255),
  email: emailSchema.nullable(),
  phone: phoneSchema.nullable(),
  consent: z.boolean(),
  join_code: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const createPatronEntrySchema = z.object({
  event_id: uuidSchema,
  display_name: z.string().min(1).max(255),
  email: emailSchema.optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  consent: z.boolean().optional(),
  join_code: z.string().optional().nullable()
}).refine(
  (data) => data.email || data.phone,
  {
    message: "Either email or phone must be provided",
    path: ["email"]
  }
)

export const updatePatronEntrySchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  email: emailSchema.optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  consent: z.boolean().optional(),
  join_code: z.string().optional().nullable()
})

// ===== ASSIGNMENT SCHEMAS =====

export const assignmentSchema = z.object({
  id: uuidSchema,
  event_id: uuidSchema,
  event_horse_id: uuidSchema,
  patron_entry_id: uuidSchema,
  assigned_by: uuidSchema.nullable(),
  created_at: z.string().datetime()
})

export const createAssignmentSchema = z.object({
  event_id: uuidSchema,
  event_horse_id: uuidSchema,
  patron_entry_id: uuidSchema,
  assigned_by: uuidSchema.optional().nullable()
})

export const updateAssignmentSchema = z.object({
  event_horse_id: uuidSchema.optional(),
  patron_entry_id: uuidSchema.optional(),
  assigned_by: uuidSchema.optional().nullable()
})

// ===== WINNER SCHEMAS =====

export const winnerSchema = z.object({
  id: uuidSchema,
  event_id: uuidSchema,
  event_horse_id: uuidSchema,
  patron_entry_id: uuidSchema,
  place: z.number().int().positive(),
  created_at: z.string().datetime()
})

export const createWinnerSchema = z.object({
  event_id: uuidSchema,
  event_horse_id: uuidSchema,
  patron_entry_id: uuidSchema,
  place: z.number().int().positive()
})

export const updateWinnerSchema = z.object({
  place: z.number().int().positive()
})

// ===== TYPESCRIPT TYPES =====

export type Tenant = z.infer<typeof tenantSchema>
export type CreateTenant = z.infer<typeof createTenantSchema>
export type UpdateTenant = z.infer<typeof updateTenantSchema>

export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>
export type UpdateUser = z.infer<typeof updateUserSchema>

export type TenantUser = z.infer<typeof tenantUserSchema>
export type CreateTenantUser = z.infer<typeof createTenantUserSchema>
export type UpdateTenantUser = z.infer<typeof updateTenantUserSchema>

export type BrandKit = z.infer<typeof brandKitSchema>
export type CreateBrandKit = z.infer<typeof createBrandKitSchema>
export type UpdateBrandKit = z.infer<typeof updateBrandKitSchema>

export type Event = z.infer<typeof eventSchema>
export type CreateEvent = z.infer<typeof createEventSchema>
export type UpdateEvent = z.infer<typeof updateEventSchema>

export type EventHorse = z.infer<typeof eventHorseSchema>
export type CreateEventHorse = z.infer<typeof createEventHorseSchema>
export type UpdateEventHorse = z.infer<typeof updateEventHorseSchema>

export type PatronEntry = z.infer<typeof patronEntrySchema>
export type CreatePatronEntry = z.infer<typeof createPatronEntrySchema>
export type UpdatePatronEntry = z.infer<typeof updatePatronEntrySchema>

export type Assignment = z.infer<typeof assignmentSchema>
export type CreateAssignment = z.infer<typeof createAssignmentSchema>
export type UpdateAssignment = z.infer<typeof updateAssignmentSchema>

export type Winner = z.infer<typeof winnerSchema>
export type CreateWinner = z.infer<typeof createWinnerSchema>
export type UpdateWinner = z.infer<typeof updateWinnerSchema>

// ===== EXTENDED TYPES WITH RELATIONS =====

export type EventWithDetails = Event & {
  tenant: Tenant
  brand_kit?: BrandKit
  horses: EventHorse[]
  patron_entries: PatronEntry[]
  assignments: Assignment[]
  winners: Winner[]
}

export type EventHorseWithAssignment = EventHorse & {
  assignment?: Assignment & {
    patron_entry: PatronEntry
  }
}

export type PatronEntryWithAssignment = PatronEntry & {
  assignment?: Assignment & {
    event_horse: EventHorse
  }
}

export type AssignmentWithDetails = Assignment & {
  event: Event
  event_horse: EventHorse
  patron_entry: PatronEntry
}

export type WinnerWithDetails = Winner & {
  event: Event
  event_horse: EventHorse
  patron_entry: PatronEntry
}

export type TenantWithUsers = Tenant & {
  tenant_users: (TenantUser & {
    user: User
  })[]
  brand_kit?: BrandKit
  events: Event[]
}

// ===== EVENT STATISTICS TYPE =====

export type EventStats = {
  total_entries: number
  total_assignments: number
  available_horses: number
  capacity: number
  is_full: boolean
}