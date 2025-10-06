import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import type {
  Tenant,
  User,
  Event,
  EventHorse,
  PatronEntry,
  Assignment,
  Winner,
  BrandKit,
  TenantUser,
  EventWithDetails,
  EventStats
} from './types'

export type DbClient = SupabaseClient<Database>

// ===== TENANT QUERIES =====

export class TenantQueries {
  constructor(private db: DbClient) {}

  async getById(id: string) {
    const { data, error } = await this.db
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Tenant
  }

  async getBySlug(slug: string) {
    const { data, error } = await this.db
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) throw error
    return data as Tenant
  }

  async getUserTenants(userId: string) {
    const { data, error } = await this.db
      .from('tenant_users')
      .select(`
        tenant:tenants(*),
        role
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data.map(item => ({
      ...item.tenant,
      user_role: item.role
    })) as (Tenant & { user_role: string })[]
  }

  async create(tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.db
      .from('tenants')
      .insert(tenant)
      .select()
      .single()

    if (error) throw error
    return data as Tenant
  }

  async update(id: string, updates: Partial<Tenant>) {
    const { data, error } = await this.db
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Tenant
  }

  async delete(id: string) {
    const { error } = await this.db
      .from('tenants')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// ===== EVENT QUERIES =====

export class EventQueries {
  constructor(private db: DbClient) {}

  async getById(id: string) {
    const { data, error } = await this.db
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Event
  }

  async getByTenant(tenantId: string) {
    const { data, error } = await this.db
      .from('events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Event[]
  }

  async getWithDetails(id: string) {
    const { data, error } = await this.db
      .from('events')
      .select(`
        *,
        tenants!tenant_id(*),
        event_horses(*),
        patron_entries(*),
        assignments(
          *,
          event_horses!event_horse_id(*),
          patron_entries!patron_entry_id(*)
        ),
        winners(
          *,
          event_horses!event_horse_id(*),
          patron_entries!patron_entry_id(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as EventWithDetails
  }

  async getPublicEvents(limit = 10) {
    const { data, error } = await this.db
      .from('events')
      .select('*')
      .eq('mode', 'sweep')
      .eq('status', 'lobby')
      .order('starts_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data as Event[]
  }

  async create(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.db
      .from('events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return data as Event
  }

  async update(id: string, updates: Partial<Event>) {
    const { data, error } = await this.db
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Event
  }

  async delete(id: string) {
    const { error } = await this.db
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async getStats(eventId: string) {
    const { data, error } = await this.db
      .rpc('get_event_stats', { event_uuid: eventId })

    if (error) throw error
    return data[0] as EventStats
  }
}

// ===== EVENT HORSE QUERIES =====

export class EventHorseQueries {
  constructor(private db: DbClient) {}

  async getByEvent(eventId: string) {
    const { data, error } = await this.db
      .from('event_horses')
      .select(`
        *,
        assignment:assignments(
          *,
          patron_entry:patron_entries(*)
        )
      `)
      .eq('event_id', eventId)
      .order('number', { ascending: true })

    if (error) throw error
    return data
  }

  async create(horse: Omit<EventHorse, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.db
      .from('event_horses')
      .insert(horse)
      .select()
      .single()

    if (error) throw error
    return data as EventHorse
  }

  async update(id: string, updates: Partial<EventHorse>) {
    const { data, error } = await this.db
      .from('event_horses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as EventHorse
  }

  async scratch(id: string) {
    return this.update(id, { is_scratched: true })
  }

  async unScratch(id: string) {
    return this.update(id, { is_scratched: false })
  }

  async setPosition(id: string, position: number) {
    return this.update(id, { position })
  }

  async bulkCreate(horses: Omit<EventHorse, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await this.db
      .from('event_horses')
      .insert(horses)
      .select()

    if (error) throw error
    return data as EventHorse[]
  }
}

// ===== PATRON ENTRY QUERIES =====

export class PatronEntryQueries {
  constructor(private db: DbClient) {}

  async getByEvent(eventId: string) {
    const { data, error } = await this.db
      .from('patron_entries')
      .select(`
        *,
        assignment:assignments(
          *,
          event_horse:event_horses(*)
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  async getById(id: string) {
    const { data, error } = await this.db
      .from('patron_entries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as PatronEntry
  }

  async create(entry: Omit<PatronEntry, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.db
      .from('patron_entries')
      .insert(entry)
      .select()
      .single()

    if (error) throw error
    return data as PatronEntry
  }

  async update(id: string, updates: Partial<PatronEntry>) {
    const { data, error } = await this.db
      .from('patron_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as PatronEntry
  }

  async delete(id: string) {
    const { error } = await this.db
      .from('patron_entries')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// ===== ASSIGNMENT QUERIES =====

export class AssignmentQueries {
  constructor(private db: DbClient) {}

  async getByEvent(eventId: string) {
    const { data, error } = await this.db
      .from('assignments')
      .select(`
        *,
        event_horse:event_horses(*),
        patron_entry:patron_entries(*)
      `)
      .eq('event_id', eventId)

    if (error) throw error
    return data
  }

  async create(assignment: Omit<Assignment, 'id' | 'created_at'>) {
    const { data, error } = await this.db
      .from('assignments')
      .insert(assignment)
      .select()
      .single()

    if (error) throw error
    return data as Assignment
  }

  async delete(id: string) {
    const { error } = await this.db
      .from('assignments')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async deleteByEvent(eventId: string) {
    const { error } = await this.db
      .from('assignments')
      .delete()
      .eq('event_id', eventId)

    if (error) throw error
  }

  async autoAssign(eventId: string) {
    const { error } = await this.db
      .rpc('auto_assign_horses', { event_uuid: eventId })

    if (error) throw error
  }
}

// ===== WINNER QUERIES =====

export class WinnerQueries {
  constructor(private db: DbClient) {}

  async getByEvent(eventId: string) {
    const { data, error } = await this.db
      .from('winners')
      .select(`
        *,
        event_horse:event_horses(*),
        patron_entry:patron_entries(*)
      `)
      .eq('event_id', eventId)
      .order('place', { ascending: true })

    if (error) throw error
    return data
  }

  async create(winner: Omit<Winner, 'id' | 'created_at'>) {
    const { data, error } = await this.db
      .from('winners')
      .insert(winner)
      .select()
      .single()

    if (error) throw error
    return data as Winner
  }

  async update(id: string, updates: Partial<Winner>) {
    const { data, error } = await this.db
      .from('winners')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Winner
  }

  async delete(id: string) {
    const { error } = await this.db
      .from('winners')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async setResults(eventId: string, results: { horseId: string, place: number }[]) {
    // First clear existing winners
    await this.db
      .from('winners')
      .delete()
      .eq('event_id', eventId)

    // Get assignments for the event
    const { data: assignments } = await this.db
      .from('assignments')
      .select('*')
      .eq('event_id', eventId)

    if (!assignments) return

    // Create winners based on results and assignments
    const winners = results.map(result => {
      const assignment = assignments.find(a => a.event_horse_id === result.horseId)
      if (!assignment) return null

      return {
        event_id: eventId,
        event_horse_id: result.horseId,
        patron_entry_id: assignment.patron_entry_id,
        place: result.place
      }
    }).filter(Boolean) as Omit<Winner, 'id' | 'created_at'>[]

    if (winners.length > 0) {
      const { data, error } = await this.db
        .from('winners')
        .insert(winners)
        .select()

      if (error) throw error
      return data as Winner[]
    }

    return []
  }
}

// ===== BRAND KIT QUERIES =====

export class BrandKitQueries {
  constructor(private db: DbClient) {}

  async getByTenant(tenantId: string) {
    const { data, error } = await this.db
      .from('brand_kits')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error) throw error
    return data as BrandKit
  }

  async update(tenantId: string, updates: Partial<BrandKit>) {
    const { data, error } = await this.db
      .from('brand_kits')
      .update(updates)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    return data as BrandKit
  }
}

// ===== USER QUERIES =====

export class UserQueries {
  constructor(private db: DbClient) {}

  async getById(id: string) {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as User
  }

  async update(id: string, updates: Partial<User>) {
    const { data, error } = await this.db
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as User
  }
}

// ===== TENANT USER QUERIES =====

export class TenantUserQueries {
  constructor(private db: DbClient) {}

  async getByTenant(tenantId: string) {
    const { data, error } = await this.db
      .from('tenant_users')
      .select(`
        *,
        user:users(*)
      `)
      .eq('tenant_id', tenantId)

    if (error) throw error
    return data
  }

  async create(tenantUser: Omit<TenantUser, 'id' | 'created_at'>) {
    const { data, error } = await this.db
      .from('tenant_users')
      .insert(tenantUser)
      .select()
      .single()

    if (error) throw error
    return data as TenantUser
  }

  async updateRole(tenantId: string, userId: string, role: string) {
    const { data, error } = await this.db
      .from('tenant_users')
      .update({ role })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as TenantUser
  }

  async delete(tenantId: string, userId: string) {
    const { error } = await this.db
      .from('tenant_users')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)

    if (error) throw error
  }
}

// ===== COMBINED QUERY CLIENT =====

export class DbQueries {
  public tenants: TenantQueries
  public events: EventQueries
  public eventHorses: EventHorseQueries
  public patronEntries: PatronEntryQueries
  public assignments: AssignmentQueries
  public winners: WinnerQueries
  public brandKits: BrandKitQueries
  public users: UserQueries
  public tenantUsers: TenantUserQueries

  constructor(db: DbClient) {
    this.tenants = new TenantQueries(db)
    this.events = new EventQueries(db)
    this.eventHorses = new EventHorseQueries(db)
    this.patronEntries = new PatronEntryQueries(db)
    this.assignments = new AssignmentQueries(db)
    this.winners = new WinnerQueries(db)
    this.brandKits = new BrandKitQueries(db)
    this.users = new UserQueries(db)
    this.tenantUsers = new TenantUserQueries(db)
  }
}

// ===== HELPER FUNCTIONS =====

export function createQueries(db: DbClient) {
  return new DbQueries(db)
}

// Type-safe subscription helpers
export function subscribeToTable<T extends keyof Database['public']['Tables']>(
  db: DbClient,
  table: T,
  filter?: string
) {
  return db
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter
      },
      (payload) => payload
    )
    .subscribe()
}

export function subscribeToEvent(db: DbClient, eventId: string) {
  return db
    .channel(`event_${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'assignments',
        filter: `event_id=eq.${eventId}`
      },
      (payload) => payload
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patron_entries',
        filter: `event_id=eq.${eventId}`
      },
      (payload) => payload
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'event_horses',
        filter: `event_id=eq.${eventId}`
      },
      (payload) => payload
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'winners',
        filter: `event_id=eq.${eventId}`
      },
      (payload) => payload
    )
    .subscribe()
}