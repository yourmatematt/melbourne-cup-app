import { z } from 'zod'

// Event creation schemas
export const newEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Name too long'),
  startsAt: z.date({
    required_error: 'Start date and time is required'
  }),
  timezone: z.string().default('Australia/Melbourne'),
  capacity: z.number().int().min(2, 'Minimum capacity is 2').max(200, 'Maximum capacity is 200'),
  mode: z.enum(['sweep', 'calcutta'], {
    required_error: 'Please select an event mode'
  }),
  entryFee: z.number().min(1, 'Entry fee must be at least $1 (leave empty for free events)').max(999.99, 'Entry fee too high').optional(),
  leadCapture: z.boolean().default(false),
  customTerms: z.string().optional(),
  customRules: z.string().optional(),
  // Promotional offer fields
  promoEnabled: z.boolean().default(false),
  promoMessage: z.string().max(500, 'Promotional message too long').optional(),
  promoDuration: z.number().int().min(1, 'Duration must be at least 1 minute').max(60, 'Duration cannot exceed 60 minutes').optional(),
  // Prize distribution fields
  prizeDistribution: z.enum(['traditional', 'winner_takes_all', 'top_two', 'equal_split', 'custom']).default('traditional'),
  firstPlacePercentage: z.number().min(0).max(100).default(60),
  secondPlacePercentage: z.number().min(0).max(100).default(30),
  thirdPlacePercentage: z.number().min(0).max(100).default(10)
})

export const horseSchema = z.object({
  number: z.number().int().min(1).max(99),
  name: z.string().min(1, 'Horse name is required').max(100, 'Name too long'),
  jockey: z.string().max(100, 'Jockey name too long').optional(),
  isScratched: z.boolean().default(false)
})

// API schema for database (snake_case field names) - only includes existing database columns
export const apiEventSchema = z.object({
  tenant_id: z.string(),
  name: z.string().min(1, 'Event name is required').max(100, 'Name too long'),
  starts_at: z.string(), // ISO string for database
  timezone: z.string(),
  mode: z.enum(['sweep', 'calcutta'], {
    required_error: 'Please select an event mode'
  }),
  status: z.string().default('draft'),
  capacity: z.number().int().min(2, 'Minimum capacity is 2').max(200, 'Maximum capacity is 200'),
  lead_capture: z.boolean(),
  // Optional database fields that may not be set during creation
  payment_timeout_minutes: z.number().int().nullable().optional(),
  requires_payment: z.boolean().optional(),
  promo_enabled: z.boolean(),
  promo_message: z.string().nullable().optional(),
  promo_duration: z.number().int().nullable().optional(),
  first_place_percentage: z.number().default(60),
  second_place_percentage: z.number().default(30),
  third_place_percentage: z.number().default(10),
  results_status: z.string().nullable().optional(),
  results_entered_by: z.string().nullable().optional(),
  results_entered_at: z.string().nullable().optional()
})

export const apiHorseSchema = z.object({
  number: z.number().int().min(1).max(99),
  name: z.string().min(1, 'Horse name is required').max(100, 'Name too long'),
  jockey: z.string().nullable().optional(),
  is_scratched: z.boolean()
})

export const eventWithHorsesSchema = z.object({
  event: newEventSchema,
  horses: z.array(horseSchema).min(1, 'At least one horse is required').max(50, 'Maximum 50 horses allowed')
})

export const apiEventWithHorsesSchema = z.object({
  event: apiEventSchema,
  horses: z.array(apiHorseSchema).min(1, 'At least one horse is required').max(50, 'Maximum 50 horses allowed')
})

// Type exports
export type NewEventFormData = z.infer<typeof newEventSchema>
export type HorseFormData = z.infer<typeof horseSchema>
export type EventWithHorsesData = z.infer<typeof eventWithHorsesSchema>
export type ApiEventData = z.infer<typeof apiEventSchema>
export type ApiHorseData = z.infer<typeof apiHorseSchema>
export type ApiEventWithHorsesData = z.infer<typeof apiEventWithHorsesSchema>