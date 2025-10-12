import { z } from 'zod'

// Event creation schemas
export const newEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Name too long'),
  startsAt: z.string().min(1, 'Start date and time is required'),
  timezone: z.string().default('Australia/Melbourne'),
  capacity: z.number().int().min(2, 'Minimum capacity is 2').max(200, 'Maximum capacity is 200'),
  mode: z.enum(['sweep', 'calcutta'], {
    required_error: 'Please select an event mode'
  }),
  entryFee: z.number().min(0, 'Entry fee cannot be negative').max(999.99, 'Entry fee too high').optional(),
  leadCapture: z.boolean().default(false),
  customTerms: z.string().optional(),
  customRules: z.string().optional(),
  // Promotional offer fields
  promoEnabled: z.boolean().default(false),
  promoMessage: z.string().max(500, 'Promotional message too long').optional(),
  promoDuration: z.number().int().min(1, 'Duration must be at least 1 minute').max(60, 'Duration cannot exceed 60 minutes').optional()
})

export const horseSchema = z.object({
  number: z.number().int().min(1).max(99),
  name: z.string().min(1, 'Horse name is required').max(100, 'Name too long'),
  jockey: z.string().max(100, 'Jockey name too long').optional(),
  isScratched: z.boolean().default(false)
})

export const eventWithHorsesSchema = z.object({
  event: newEventSchema,
  horses: z.array(horseSchema).min(1, 'At least one horse is required').max(50, 'Maximum 50 horses allowed')
})

// Type exports
export type NewEventFormData = z.infer<typeof newEventSchema>
export type HorseFormData = z.infer<typeof horseSchema>
export type EventWithHorsesData = z.infer<typeof eventWithHorsesSchema>