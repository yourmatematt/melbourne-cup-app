// Export database types
export type { Database } from './types/database.types'

// Export all custom types
export type {
  // Base types
  Tenant,
  User,
  TenantUser,
  BrandKit,
  Event,
  EventHorse,
  PatronEntry,
  Assignment,
  Winner,

  // Create types
  CreateTenant,
  CreateUser,
  CreateTenantUser,
  CreateBrandKit,
  CreateEvent,
  CreateEventHorse,
  CreatePatronEntry,
  CreateAssignment,
  CreateWinner,

  // Update types
  UpdateTenant,
  UpdateUser,
  UpdateTenantUser,
  UpdateBrandKit,
  UpdateEvent,
  UpdateEventHorse,
  UpdatePatronEntry,
  UpdateAssignment,
  UpdateWinner,

  // Extended types with relations
  EventWithDetails,
  EventHorseWithAssignment,
  PatronEntryWithAssignment,
  AssignmentWithDetails,
  WinnerWithDetails,
  TenantWithUsers,

  // Statistics types
  EventStats,

  // Enum types
  BillingStatus,
  UserRole,
  EventMode,
  EventStatus
} from './src/types'

// Export enum constants
export {
  BillingStatus,
  UserRole,
  EventMode,
  EventStatus
} from './src/types'

// Export Zod schemas
export {
  // Base schemas
  tenantSchema,
  userSchema,
  tenantUserSchema,
  brandKitSchema,
  eventSchema,
  eventHorseSchema,
  patronEntrySchema,
  assignmentSchema,
  winnerSchema,

  // Create schemas
  createTenantSchema,
  createUserSchema,
  createTenantUserSchema,
  createBrandKitSchema,
  createEventSchema,
  createEventHorseSchema,
  createPatronEntrySchema,
  createAssignmentSchema,
  createWinnerSchema,

  // Update schemas
  updateTenantSchema,
  updateUserSchema,
  updateTenantUserSchema,
  updateBrandKitSchema,
  updateEventSchema,
  updateEventHorseSchema,
  updatePatronEntrySchema,
  updateAssignmentSchema,
  updateWinnerSchema,

  // Field validation schemas
  billingStatusSchema,
  userRoleSchema,
  eventModeSchema,
  eventStatusSchema,
  uuidSchema,
  emailSchema,
  phoneSchema
} from './src/types'

// Export query helpers
export type { DbClient } from './src/query-helpers'
export {
  DbQueries,
  TenantQueries,
  EventQueries,
  EventHorseQueries,
  PatronEntryQueries,
  AssignmentQueries,
  WinnerQueries,
  BrandKitQueries,
  UserQueries,
  TenantUserQueries,
  createQueries,
  subscribeToTable,
  subscribeToEvent
} from './src/query-helpers'