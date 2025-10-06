# Melbourne Cup Database Types & Helpers

This package provides TypeScript types, Zod validation schemas, and type-safe query helpers for the Melbourne Cup venue sweep platform database.

## Features

- **🔷 TypeScript Types**: Complete type definitions for all database entities
- **✅ Zod Validation**: Runtime validation schemas for all entities
- **🔍 Query Helpers**: Type-safe database query classes
- **📡 Realtime Support**: Subscription helpers for live updates
- **🏗️ Type Safety**: Full end-to-end type safety with Supabase

## Installation

```bash
npm install @melbourne-cup/db
```

## Usage

### Basic Types

```typescript
import type { Event, EventStatus, CreateEvent } from '@melbourne-cup/db'

// Use types for function parameters
function createEvent(data: CreateEvent): Promise<Event> {
  // Implementation
}

// Use enums for type-safe constants
const status: EventStatus = EventStatus.LOBBY
```

### Zod Validation

```typescript
import { createEventSchema, eventStatusSchema } from '@melbourne-cup/db'

// Validate form data
const result = createEventSchema.safeParse(formData)
if (result.success) {
  const validEvent = result.data
}

// Validate individual fields
const status = eventStatusSchema.parse('lobby') // ✅ Valid
```

### Query Helpers

```typescript
import { createQueries } from '@melbourne-cup/db'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)
const queries = createQueries(supabase)

// Type-safe queries
const event = await queries.events.getById('event-id')
const horses = await queries.eventHorses.getByEvent('event-id')
const stats = await queries.events.getStats('event-id')

// Auto-assignment
await queries.assignments.autoAssign('event-id')
```

### Realtime Subscriptions

```typescript
import { subscribeToEvent } from '@melbourne-cup/db'

// Subscribe to all changes for an event
const subscription = subscribeToEvent(supabase, 'event-id')

subscription.on('postgres_changes', (payload) => {
  console.log('Event update:', payload)
})
```

## Available Types

### Core Entities
- `Tenant` - Organization/venue
- `User` - Platform user
- `Event` - Melbourne Cup event
- `EventHorse` - Horse in an event
- `PatronEntry` - Participant entry
- `Assignment` - Horse-to-patron assignment
- `Winner` - Race results

### Extended Types
- `EventWithDetails` - Event with all relations
- `EventStats` - Event statistics
- `PatronEntryWithAssignment` - Entry with horse assignment

### Enums
- `EventStatus`: `'draft' | 'lobby' | 'drawing' | 'complete'`
- `EventMode`: `'sweep' | 'calcutta'`
- `UserRole`: `'owner' | 'host'`
- `BillingStatus`: `'active' | 'suspended' | 'trial' | 'cancelled'`

## Query Classes

### EventQueries
- `getById(id)` - Get event by ID
- `getByTenant(tenantId)` - Get tenant events
- `getWithDetails(id)` - Get event with relations
- `getStats(id)` - Get event statistics
- `create(event)` - Create new event
- `update(id, updates)` - Update event

### EventHorseQueries
- `getByEvent(eventId)` - Get event horses
- `create(horse)` - Add horse to event
- `scratch(id)` - Mark horse as scratched
- `setPosition(id, position)` - Set finishing position

### PatronEntryQueries
- `getByEvent(eventId)` - Get event participants
- `create(entry)` - Add new participant
- `update(id, updates)` - Update participant

### AssignmentQueries
- `getByEvent(eventId)` - Get all assignments
- `create(assignment)` - Manual assignment
- `autoAssign(eventId)` - Auto-assign all

### WinnerQueries
- `getByEvent(eventId)` - Get race results
- `setResults(eventId, results)` - Set final results

## Validation Schemas

All entities have corresponding Zod schemas:
- Base schemas: `tenantSchema`, `eventSchema`, etc.
- Create schemas: `createEventSchema`, `createPatronEntrySchema`, etc.
- Update schemas: `updateEventSchema`, `updateTenantSchema`, etc.
- Field schemas: `emailSchema`, `phoneSchema`, `uuidSchema`, etc.

## Development

```bash
# Type checking
npm run type-check

# Generate fresh database types
npm run types

# Create new migration
npm run migration:new <name>

# Apply migrations
npm run migrate

# Reset database
npm run reset
```

## Database Schema

The package includes migrations for:
- Multi-tenant architecture with RLS
- Real-time subscriptions
- Performance indexes
- Data validation constraints
- Utility functions and triggers