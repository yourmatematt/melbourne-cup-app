import { z } from 'zod'

// Patron join schemas
export const patronJoinSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional().or(z.literal('')),
  marketingConsent: z.boolean().default(false)
}).refine(
  (data) => data.email || data.phone,
  {
    message: "Please provide either an email or phone number",
    path: ["email"]
  }
)

// Type exports
export type PatronJoinFormData = z.infer<typeof patronJoinSchema>

// Join code generation
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}